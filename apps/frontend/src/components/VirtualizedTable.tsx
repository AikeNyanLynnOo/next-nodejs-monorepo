"use client";

import type React from "react";

import { memo, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { User } from "./DataTable";

interface Column {
  key: keyof User;
  label: string;
  width: number;
  sortable: boolean;
}

interface VirtualizedTableProps {
  data: User[];
  columns: Column[];
  loading: boolean;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: User[];
    columns: Column[];
  };
}

// Memoized row component to prevent unnecessary re-renders
const TableRow = memo<RowProps>(({ index, style, data }) => {
  const user = data.items[index];
  const isEven = index % 2 === 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    // Force a fixed timezone so SSR and client render identical output
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <div
      style={style}
      className={`flex border-b border-gray-200 hover:bg-gray-50 transition-colors ${
        isEven ? "bg-white" : "bg-gray-25"
      }`}
    >
      {data.columns.map((column) => (
        <div
          key={column.key}
          className="flex items-center p-3 text-sm border-r border-gray-200 last:border-r-0 overflow-hidden"
          style={{ width: column.width, minWidth: column.width }}
        >
          {column.key === "orderTotal" ? (
            <span className="font-medium text-green-600">
              {user[column.key]}
            </span>
          ) : column.key === "createdAt" ? (
            <span className="text-gray-500">
              {formatDate(user[column.key] as string)}
            </span>
          ) : column.key === "email" ? (
            <span className="truncate" title={user[column.key] as string}>
              {user[column.key]}
            </span>
          ) : (
            <span>{user[column.key]}</span>
          )}
        </div>
      ))}
    </div>
  );
});

TableRow.displayName = "TableRow";

export const VirtualizedTable = memo<VirtualizedTableProps>(
  ({ data, columns, loading }) => {
    const itemData = useMemo(
      () => ({
        items: data,
        columns,
      }),
      [data, columns]
    );

    const ROW_HEIGHT = 60;
    const MAX_HEIGHT = 600;

    // Calculate total width from all columns
    const totalWidth = useMemo(
      () => columns.reduce((sum, col) => sum + col.width, 0),
      [columns]
    );

    return (
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}

        <List
          height={Math.min(data.length * ROW_HEIGHT, MAX_HEIGHT)}
          width={totalWidth}
          itemCount={data.length}
          itemSize={ROW_HEIGHT}
          itemData={itemData}
          overscanCount={5}
        >
          {TableRow}
        </List>
      </div>
    );
  }
);

VirtualizedTable.displayName = "VirtualizedTable";
