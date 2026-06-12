"use client";

import { Check, PlusCircle } from "lucide-react";
import type { Column } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface FacetedOption {
  label: string;
  value: string;
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title: string;
  options: FacetedOption[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const selectedValues = new Set((column?.getFilterValue() as string[]) ?? []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 border-primary/25 bg-white shadow-sm hover:border-primary/45 hover:bg-accent"
        >
          <PlusCircle className="h-4 w-4" />
          {title}
          {selectedValues.size > 0 ? (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {selectedValues.size}
              </Badge>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div className="grid gap-1">
          {options.map((option) => {
            const selected = selectedValues.has(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  if (selected) {
                    selectedValues.delete(option.value);
                  } else {
                    selectedValues.add(option.value);
                  }
                  const values = Array.from(selectedValues);
                  column?.setFilterValue(values.length ? values : undefined);
                }}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 place-items-center rounded-sm border",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {selected ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
          {selectedValues.size > 0 ? (
            <>
              <Separator className="my-1" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => column?.setFilterValue(undefined)}
              >
                Clear filters
              </Button>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
