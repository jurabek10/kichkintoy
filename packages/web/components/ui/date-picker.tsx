"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { currentDateLocale } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  id?: string;
  /** ISO date string, e.g. "2026-06-13". */
  value?: string;
  /** Emits an ISO date string, matching a native date input. */
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Inclusive ISO bounds. */
  min?: string;
  max?: string;
}

export function DatePicker({
  id,
  value,
  onValueChange,
  placeholder = "Select date",
  disabled,
  className,
  min,
  max,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const locale = currentDateLocale();

  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  const minDate = min ? parseISO(min) : undefined;
  const maxDate = max ? parseISO(max) : undefined;
  const disabledDays: Matcher[] = [];
  if (minDate && isValid(minDate)) disabledDays.push({ before: minDate });
  if (maxDate && isValid(maxDate)) disabledDays.push({ after: maxDate });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start gap-2 px-3 font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">
            {selected ? format(selected, "d MMM yyyy", { locale }) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          locale={locale}
          selected={selected}
          defaultMonth={selected}
          disabled={disabledDays.length ? disabledDays : undefined}
          onSelect={(date) => {
            if (date) {
              onValueChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
