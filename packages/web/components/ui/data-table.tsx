"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Table as TableInstance,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Rows per page (docquery-style client pagination). Default 10. */
  pageSize?: number;
  /** Message shown when there are no rows. */
  emptyMessage?: string;
  /** Builds the "Page X of Y" label for i18n. */
  pageLabel?: (page: number, total: number) => string;
  toolbar?: (table: TableInstance<TData>) => React.ReactNode;
  /** Columns hidden on first render (e.g. a filter-only column). */
  initialColumnVisibility?: VisibilityState;
  /** Navigates / acts on a row when clicked; also adds pointer affordances. */
  onRowClick?: (row: TData) => void;
  /** Extra classes per row, e.g. to dim past entries. */
  rowClassName?: (row: TData) => string | undefined;
  className?: string;
  tableClassName?: string;
  /** Controlled server pagination. Omit for the usual client pagination. */
  serverPagination?: {
    pageIndex: number;
    pageCount: number;
    onPageIndexChange: (pageIndex: number) => void;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = "No results.",
  pageLabel,
  toolbar,
  initialColumnVisibility,
  onRowClick,
  rowClassName,
  className,
  tableClassName,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility ?? {});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      ...(serverPagination
        ? { pagination: { pageIndex: serverPagination.pageIndex, pageSize } }
        : {}),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: Boolean(serverPagination),
    pageCount: serverPagination?.pageCount,
    onPaginationChange: serverPagination
      ? (updater) => {
          const current = {
            pageIndex: serverPagination.pageIndex,
            pageSize,
          };
          const next =
            typeof updater === "function" ? updater(current) : updater;
          serverPagination.onPageIndexChange(next.pageIndex);
        }
      : undefined,
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {toolbar ? toolbar(table) : null}
      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        <Table className={tableClassName}>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  className={cn(
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} pageLabel={pageLabel} />
    </div>
  );
}
