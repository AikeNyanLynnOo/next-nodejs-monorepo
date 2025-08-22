"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Folder,
  File,
  AlertCircle,
} from "lucide-react";

export interface Node {
  id: string;
  parentId: string | null;
  name: string;
  hasChildren: boolean;
}

export interface SearchResult {
  id: string;
  name: string;
  path: { id: string; name: string }[];
}

interface TreeNode extends Node {
  children?: TreeNode[];
  loading?: boolean;
  level: number;
}

interface OrgChartProps {
  apiUrl?: string;
}

export function OrgChart({
  apiUrl = process.env.NEXT_PUBLIC_API_URL,
}: OrgChartProps) {
  // Core state management
  const [nodesMap, setNodesMap] = useState<Map<string, TreeNode>>(
    new Map<string, TreeNode>()
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set<string>()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rootNodeIds, setRootNodeIds] = useState<string[]>([]);
  const [isAutoExpanding, setIsAutoExpanding] = useState(false);

  // Refs for optimization
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch root nodes
  const fetchRootNodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${apiUrl}/nodes/root`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const rootNodes: Node[] = await response.json();

      const treeNodes: TreeNode[] = rootNodes.map((node) => ({
        ...node,
        level: 0,
      }));

      const newNodesMap = new Map<string, TreeNode>();
      treeNodes.forEach((node) => newNodesMap.set(node.id, node));

      setNodesMap(newNodesMap);
      setRootNodeIds(rootNodes.map((n) => n.id));
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Collapse all when search input is cleared
  useEffect(() => {
    if (!searchQuery.trim()) {
      setExpandedIds(new Set<string>());
    }
  }, [searchQuery]);

  // Fetch children for a specific node
  const fetchChildren = useCallback(
    async (nodeId: string, level: number) => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const response = await fetch(`${apiUrl}/nodes/${nodeId}/children`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const children: Node[] = await response.json();

        return children.map((child) => ({
          ...child,
          level: level + 1,
        }));
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Failed to fetch children:", err);
        }
        return [];
      }
    },
    [apiUrl]
  );

  // Search nodes with debouncing
  const searchNodes = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const response = await fetch(
          `${apiUrl}/search?q=${encodeURIComponent(query)}&limit=100`,
          {
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const results: SearchResult[] = await response.json();
        setSearchResults(results);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Search failed:", err);
          setSearchResults([]);
        }
      }
    },
    [apiUrl]
  );

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchNodes(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchNodes]);

  // Load initial data
  useEffect(() => {
    fetchRootNodes();
  }, [fetchRootNodes]);

  // Expand node and load children
  const expandNode = useCallback(
    async (nodeId: string) => {
      const node = nodesMap.get(nodeId);
      if (!node) return;

      // Prevent multiple simultaneous expansions of the same node
      if (node.loading) return;

      // Toggle expansion
      const newExpandedIds = new Set(expandedIds);
      if (newExpandedIds.has(nodeId)) {
        newExpandedIds.delete(nodeId);
        setExpandedIds(newExpandedIds);
        return;
      }

      // Expand and load children if needed
      newExpandedIds.add(nodeId);
      setExpandedIds(newExpandedIds);

      // Load children if they haven't been loaded yet
      if (node.hasChildren && !node.children && !node.loading) {
        // Mark as loading
        setNodesMap((prev) => {
          const newMap = new Map(prev);
          const updatedNode = { ...node, loading: true };
          newMap.set(nodeId, updatedNode);
          return newMap;
        });

        try {
          // Fetch children
          const children = await fetchChildren(nodeId, node.level);

          // Ensure no duplicate children in the array
          const uniqueChildren = children.filter(
            (child, index, self) =>
              index === self.findIndex((c) => c.id === child.id)
          );

          setNodesMap((prev) => {
            const newMap = new Map(prev);
            // Add children to the map for quick access (avoid duplicates)
            uniqueChildren.forEach((child) => {
              if (!newMap.has(child.id)) {
                newMap.set(child.id, child);
              }
            });
            // Update the parent node with its children
            const updatedNode = {
              ...node,
              children: uniqueChildren,
              loading: false,
            };
            newMap.set(nodeId, updatedNode);
            return newMap;
          });
        } catch (error) {
          // Handle error by removing loading state
          setNodesMap((prev) => {
            const newMap = new Map(prev);
            const updatedNode = { ...node, loading: false };
            newMap.set(nodeId, updatedNode);
            return newMap;
          });
        }
      }
    },
    [nodesMap, expandedIds, fetchChildren]
  );

  const expandNodeIfNeeded = useCallback(
    async (nodeId: string) => {
      if (!expandedIds.has(nodeId)) {
        await expandNode(nodeId);
      }
    },
    [expandedIds, expandNode]
  );

  // Ensure an entire path (root -> ... -> target) is loaded and expanded
  const ensurePathExpanded = useCallback(
    async (path: { id: string; name: string }[]) => {
      for (let i = 0; i < path.length - 1; i++) {
        const currentId = path[i].id;
        // If node is not yet in map (e.g., deeper ancestor), try expanding its parent first
        if (!nodesMap.get(currentId) && i > 0) {
          const parentId = path[i - 1].id;
          await expandNodeIfNeeded(parentId);
        }
        await expandNodeIfNeeded(currentId);
      }
    },
    [nodesMap, expandNodeIfNeeded]
  );

  // Auto-expand paths for search results
  const expandSearchPaths = useCallback(
    async (results: SearchResult[]) => {
      if (isAutoExpanding) return; // Prevent recursive auto-expansion

      setIsAutoExpanding(true);
      const pathsToExpand = new Set<string>();

      // Collect unique paths that need to be expanded
      results.forEach((result) => {
        result.path.forEach((pathNode, index) => {
          if (index < result.path.length - 1) {
            // Don't expand the matched node itself
            pathsToExpand.add(pathNode.id);
          }
        });
      });

      // Expand each path in order
      for (const nodeId of pathsToExpand) {
        if (!expandedIds.has(nodeId)) {
          await expandNodeIfNeeded(nodeId);
        }
      }
      setIsAutoExpanding(false);
    },
    [expandedIds, expandNodeIfNeeded, isAutoExpanding]
  );

  // Auto-expand when search results change
  useEffect(() => {
    if (searchResults.length > 0 && searchQuery.trim() && !isAutoExpanding) {
      expandSearchPaths(searchResults);
    }
  }, [searchResults, expandSearchPaths, searchQuery, isAutoExpanding]);

  // Check if a node is in search results
  const isSearchMatch = useCallback(
    (nodeId: string) => {
      return searchResults.some((result) => result.id === nodeId);
    },
    [searchResults]
  );

  // Check if a node is in search path
  const isInSearchPath = useCallback(
    (nodeId: string) => {
      return searchResults.some((result) =>
        result.path.some((pathNode) => pathNode.id === nodeId)
      );
    },
    [searchResults]
  );

  // Highlight search matches in text
  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, []);

  // Get visible nodes (only expanded branches)
  const getVisibleNodes = useCallback(
    (nodeIds: string[]): TreeNode[] => {
      const visible: TreeNode[] = [];
      const seenIds = new Set<string>();

      const traverse = (ids: string[]) => {
        ids.forEach((id) => {
          const node = nodesMap.get(id);
          if (!node || seenIds.has(id)) return;

          seenIds.add(id);
          visible.push(node);

          // Show children if node is expanded and has children
          if (
            expandedIds.has(id) &&
            node.children &&
            node.children.length > 0
          ) {
            traverse(node.children.map((child) => child.id));
          }
        });
      };

      traverse(nodeIds);
      return visible;
    },
    [nodesMap, expandedIds]
  );

  // Memoized visible nodes
  const visibleNodes = useMemo(
    () => getVisibleNodes(rootNodeIds),
    [getVisibleNodes, rootNodeIds]
  );

  // Render a single tree node
  const renderNode = useCallback(
    (node: TreeNode) => {
      const isMatch = isSearchMatch(node.id);
      const inPath = isInSearchPath(node.id);
      const isExpanded = expandedIds.has(node.id);

      return (
        <div key={node.id} className="select-none">
          <div
            className={`
            flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 transition-colors
            ${isMatch ? "bg-yellow-100 border border-yellow-300" : ""}
            ${inPath && !isMatch ? "bg-blue-50" : ""}
          `}
            style={{ paddingLeft: `${node.level * 20 + 8}px` }}
          >
            {node.hasChildren ? (
              <button
                onClick={() => expandNode(node.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={node.loading}
              >
                {node.loading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                ) : isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}

            {node.hasChildren ? (
              <Folder className="w-4 h-4 text-blue-500" />
            ) : (
              <File className="w-4 h-4 text-gray-400" />
            )}

            <span className={`text-sm ${isMatch ? "font-semibold" : ""}`}>
              {highlightText(node.name, searchQuery)}
            </span>
          </div>

          {/* Children are rendered separately in the visibleNodes array */}
        </div>
      );
    },
    [
      expandedIds,
      isSearchMatch,
      isInSearchPath,
      highlightText,
      searchQuery,
      expandNode,
    ]
  );

  // Render search results
  const renderSearchResults = useCallback(() => {
    if (!searchQuery.trim()) return null;

    return (
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Search Results ({searchResults.length})
        </h3>
        <div className="space-y-1">
          {searchResults.map((result) => (
            <div key={result.id} className="text-sm">
              <div className="font-medium text-blue-600">
                {highlightText(result.name, searchQuery)}
              </div>
              <div className="text-gray-500 text-xs">
                {result.path.map((pathNode, index) => (
                  <span key={pathNode.id}>
                    {index > 0 && " > "}
                    {highlightText(pathNode.name, searchQuery)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [searchQuery, searchResults, highlightText]);

  if (error) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">Error: {error}</p>
            <button
              className="mt-2 px-3 py-1 text-xs bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
              onClick={fetchRootNodes}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Org File Explorer
        </h2>
        <button
          onClick={() => {
            setExpandedIds(new Set<string>());
            fetchRootNodes();
          }}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Search Results */}
      {renderSearchResults()}

      {/* Tree */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {loading && nodesMap.size === 0 ? (
          <div className="p-8 text-center">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  <div
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: `${100 + i * 20}px` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : nodesMap.size === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No nodes found. Try seeding the database first.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {visibleNodes.map((node) => renderNode(node))}
          </div>
        )}
      </div>
    </div>
  );
}
