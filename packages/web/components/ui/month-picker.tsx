"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { currentDateLocale } from "@/lib/date";
import { cn } from "@/lib/utils";

/**
 * A localized month/year picker. The native <input type="month"> renders its
 * label in the *browser's* locale (so it stays English even under Uzbek), so
 * we use a custom control that formats months with the active date-fns locale.
 */
export function MonthPicker({
  value,
  onValueChange,
  className,
}: {
  /** "YYYY-MM" */
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const locale = currentDateLocale();

  const [year, month] = value.split("-").map(Number);
  const [viewYear, setViewYear] = React.useState(year);
  React.useEffect(() => setViewYear(year), [year]);

  const label = capitalize(
    format(new Date(year, (month || 1) - 1, 1), "LLLL yyyy", { locale }),
  );

  function pick(monthIndex: number) {
    onValueChange(`${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-10 justify-start gap-2 px-3 font-normal", className)}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setViewYear((y) => y - 1)}
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold">{viewYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setViewYear((y) => y + 1)}
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i).map((i) => {
            const active = viewYear === year && i === month - 1;
            return (
              <Button
                key={i}
                type="button"
                variant={active ? "default" : "ghost"}
                size="sm"
                className="capitalize"
                onClick={() => pick(i)}
              >
                {format(new Date(viewYear, i, 1), "LLL", { locale })}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
