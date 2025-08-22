"use client";

import type React from "react";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronUp, ChevronDown, Search, AlertCircle } from "lucide-react";
import { VirtualizedTable } from "./VirtualizedTable";

export interface User {
  id: number;
  name: string;
  email: string;
  status: "active" | "inactive" | "pending";
  orderTotal: number;
  createdAt: string;
  orderCount: number;
}

interface TableState {
  page: number;
  pageSize: number;
  sortBy: keyof User | null;
  sortOrder: "asc" | "desc";
  filter: string;
}

interface ApiResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

const DEBOUNCE_DELAY = 250;

export function DataTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tableState, setTableState] = useState<TableState>({
    page: 1,
    pageSize: 50,
    sortBy: null,
    sortOrder: "asc",
    filter: "",
  });

  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout>(null);
  const abortControllerRef = useRef<AbortController>(null);

  // Debounced filter function
  const debouncedSetFilter = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setTableState((prev) => ({ ...prev, filter: value, page: 1 }));
    }, DEBOUNCE_DELAY);
  }, []);

  // Fetch data function with abort controller for performance
  const fetchData = useCallback(async (state: TableState) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: state.page.toString(),
        pageSize: state.pageSize.toString(),
        search: state.filter,
        ...(state.sortBy && {
          sortBy: state.sortBy,
          sortDir: state.sortOrder,
        }),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users?${params}`,
        {
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      console.log("result>>", result);

      // Simulate network delay for demo (remove in production)
      await new Promise((resolve) => setTimeout(resolve, 100));

      setData(result.items);
      setTotal(result.total);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to fetch data when table state changes
  useEffect(() => {
    fetchData(tableState);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tableState, fetchData]);

  // Initialize table state from URL query params on first render
  useEffect(() => {
    // Guard for client only
    if (!searchParams) return;

    const pageParam = Number(searchParams.get("page") || "");
    const pageSizeParam = Number(searchParams.get("pageSize") || "");
    const filterParam = searchParams.get("search") || "";
    const sortByParamRaw = searchParams.get("sortBy") || "";
    const sortDirParam = (searchParams.get("sortDir") || "") as "asc" | "desc";

    setTableState((prev) => {
      let next = { ...prev };
      if (Number.isFinite(pageParam) && pageParam > 0) next.page = pageParam;
      if (Number.isFinite(pageSizeParam) && pageSizeParam > 0) next.pageSize = pageSizeParam;
      if (filterParam) next.filter = filterParam;
      const allowedSortKeys: Array<keyof User> = [
        "id",
        "name",
        "email",
        "orderTotal",
        "orderCount",
        "createdAt",
      ];
      if (allowedSortKeys.includes(sortByParamRaw as keyof User)) {
        next.sortBy = sortByParamRaw as keyof User;
      }
      if (sortDirParam === "asc" || sortDirParam === "desc") next.sortOrder = sortDirParam;
      return next;
    });
    // run only once on mount to hydrate from URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL query params in sync with table state (including sortBy & sortDir)
  useEffect(() => {
    if (!router || !pathname) return;
    const params = new URLSearchParams();
    params.set("page", String(tableState.page));
    params.set("pageSize", String(tableState.pageSize));
    if (tableState.filter) params.set("search", tableState.filter); else params.delete("search");
    if (tableState.sortBy) params.set("sortBy", String(tableState.sortBy)); else params.delete("sortBy");
    if (tableState.sortBy) params.set("sortDir", tableState.sortOrder); else params.delete("sortDir");

    const nextUrl = `${pathname}?${params.toString()}`;
    const current = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
    if (current !== nextUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [router, pathname, tableState.page, tableState.pageSize, tableState.filter, tableState.sortBy, tableState.sortOrder]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSort = useCallback((column: keyof User) => {
    setTableState((prev) => ({
      ...prev,
      sortBy: column,
      sortOrder:
        prev.sortBy === column && prev.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setTableState((prev) => ({ ...prev, page: newPage }));
  }, []);

  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSetFilter(e.target.value);
    },
    [debouncedSetFilter]
  );

  // Memoized pagination info
  const paginationInfo = useMemo(() => {
    const totalPages = Math.ceil(total / tableState.pageSize);
    const startItem = (tableState.page - 1) * tableState.pageSize + 1;
    const endItem = Math.min(tableState.page * tableState.pageSize, total);

    return { totalPages, startItem, endItem };
  }, [total, tableState.page, tableState.pageSize]);

  // Memoized column definitions
  const columns = useMemo(
    () => [
      {
        key: "id" as keyof User,
        label: "ID",
        width: 80,
        sortable: true,
      },
      {
        key: "name" as keyof User,
        label: "Name",
        width: 200,
        sortable: true,
      },
      {
        key: "email" as keyof User,
        label: "Email",
        width: 250,
        sortable: true,
      },
      {
        key: "orderTotal" as keyof User,
        label: "Total Order Amount",
        width: 180,
        sortable: true,
      },
      {
        key: "orderCount" as keyof User,
        label: "Orders",
        width: 100,
        sortable: true,
      },
      {
        key: "createdAt" as keyof User,
        label: "Last Order",
        width: 150,
        sortable: true,
      },
    ],
    []
  );

  // Total width for horizontal scrolling alignment
  const totalWidth = useMemo(
    () => columns.reduce((sum, col) => sum + col.width, 0),
    [columns]
  );

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">Error loading data: {error}</p>
            <button
              className="mt-2 px-3 py-1 text-xs bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
              onClick={() => fetchData(tableState)}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      {/* Search and Controls */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onChange={handleFilterChange}
          />
        </div>

        <div className="text-sm text-gray-500">
          {loading ? (
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            `${paginationInfo.startItem}-${paginationInfo.endItem} of ${total} users`
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto max-w-fit">
        {/* Table Header */}
        <div className="bg-gray-50 border-b border-gray-200" style={{ width: totalWidth }}>
          <div className="flex">
            {columns.map((column) => (
              <div
                key={column.key}
                className="flex items-center gap-2 p-3 font-medium text-sm border-r border-gray-200 last:border-r-0"
                style={{ width: column.width, minWidth: column.width }}
              >
                <span>{column.label}</span>
                {column.sortable && (
                  <button
                    className="h-4 w-4 p-0 hover:bg-gray-200 rounded transition-colors flex items-center justify-center"
                    onClick={() => handleSort(column.key)}
                  >
                    {tableState.sortBy === column.key ? (
                      tableState.sortOrder === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <div className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Table Body */}
        {loading && data.length === 0 ? (
          <div className="p-8" style={{ width: totalWidth }}>
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className="h-4 bg-gray-200 rounded animate-pulse"
                      style={{ width: column.width - 24 }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <div style={{ width: totalWidth }}>
            <VirtualizedTable data={data} columns={columns} loading={loading} />
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500">
            Page {tableState.page} of {paginationInfo.totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={tableState.page === 1 || loading}
              onClick={() => handlePageChange(tableState.page - 1)}
            >
              Previous
            </button>

            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={tableState.page >= paginationInfo.totalPages || loading}
              onClick={() => handlePageChange(tableState.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
