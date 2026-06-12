"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";
import type { Column } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 px-2 text-xs font-bold uppercase"
          >
            <span>{title}</span>
            {sorted === "desc" ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : sorted === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-40 p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => column.toggleSorting(false)}
          >
            <ArrowUp className="h-4 w-4" />
            Asc
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => column.toggleSorting(true)}
          >
            <ArrowDown className="h-4 w-4" />
            Desc
          </Button>
          {column.getCanHide() ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => column.toggleVisibility(false)}
            >
              <EyeOff className="h-4 w-4" />
              Hide
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
