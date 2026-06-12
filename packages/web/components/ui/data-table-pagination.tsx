import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  /** Builds the "Page X of Y" label; defaults to English to match docquery. */
  pageLabel?: (page: number, total: number) => string;
}

export function DataTablePagination<TData>({
  table,
  pageLabel,
}: DataTablePaginationProps<TData>) {
  const page = table.getState().pagination.pageIndex + 1;
  const total = Math.max(table.getPageCount(), 1);

  return (
    <div className="mt-2 flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground" />
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex w-[120px] items-center justify-center text-sm font-medium">
          {pageLabel ? pageLabel(page, total) : `Page ${page} of ${total}`}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
