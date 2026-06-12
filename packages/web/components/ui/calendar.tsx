"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn(defaults.root, "w-fit"),
        months: cn(defaults.months, "relative flex flex-col gap-4 sm:flex-row"),
        month: cn(defaults.month, "flex flex-col gap-3"),
        month_caption: cn(
          defaults.month_caption,
          "flex h-9 items-center justify-center px-9",
        ),
        caption_label: cn(defaults.caption_label, "text-sm font-extrabold"),
        nav: cn(
          defaults.nav,
          "absolute inset-x-0 top-0 flex items-center justify-between",
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 rounded-lg p-0",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 rounded-lg p-0",
        ),
        month_grid: cn(defaults.month_grid, "w-full border-collapse"),
        weekdays: cn(defaults.weekdays, "flex"),
        weekday: cn(
          defaults.weekday,
          "w-9 text-[0.7rem] font-bold uppercase text-muted-foreground",
        ),
        week: cn(defaults.week, "mt-1.5 flex w-full"),
        day: cn(defaults.day, "p-0 text-center text-sm"),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-xl p-0 font-semibold",
        ),
        today: cn(
          defaults.today,
          "[&>button]:font-extrabold [&>button]:text-primary",
        ),
        selected: cn(
          defaults.selected,
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:shadow-card [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground",
        ),
        outside: cn(defaults.outside, "[&>button]:text-muted-foreground/40"),
        disabled: cn(defaults.disabled, "[&>button]:text-muted-foreground/30"),
        hidden: cn(defaults.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", chevronClass)} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", chevronClass)} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
