"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, ImageIcon, Plus, Search, Utensils } from "lucide-react";
import type { MealPostSummary, MealType } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDate } from "@/lib/format";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { MealCard } from "./meal-card";
import { SignedMealImage } from "./signed-meal-image";
import {
  mealAudienceLabelKey,
  mealStatusLabelKey,
  mealTypeLabelKey,
} from "./meal-labels";

type Period = "all" | "month" | "day";

const mealTypes: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export function StaffMeals({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("meals");
  const router = useRouter();
  const today = todayIso();

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);

  const todayInput = { centerId: centerId ?? "", date: today };
  const todayQuery = useQuery({
    queryKey: queryKeys.meals.staffList(todayInput),
    queryFn: () => orpc.meals.staffList(todayInput),
    enabled: !!centerId,
  });

  const allInput = { centerId: centerId ?? "" };
  const allQuery = useQuery({
    queryKey: queryKeys.meals.staffList(allInput),
    queryFn: () => orpc.meals.staffList(allInput),
    enabled: !!centerId,
  });

  const todayMeals = todayQuery.data ?? [];
  const allMeals = allQuery.data ?? [];

  const columns = useMemo<ColumnDef<MealPostSummary>[]>(
    () => buildColumns(t, router),
    [t, router],
  );

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const error = todayQuery.error ?? allQuery.error;

  const query = search.trim().toLowerCase();
  const rows = allMeals.filter((meal) => {
    if (type !== "all" && meal.mealType !== type) return false;
    if (status !== "all" && meal.status !== status) return false;
    if (period === "month" && meal.mealDate.slice(0, 7) !== month) return false;
    if (period === "day" && meal.mealDate !== day) return false;
    if (query) {
      const haystack = [
        meal.menuText,
        meal.allergyNote ?? "",
        meal.classes.map((c) => c.name).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("staffDescription")}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/meals/new">
              <Plus className="h-4 w-4" />
              {t("newMeal")}
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold">{t("todaySection")}</h2>
          <span className="text-sm text-muted-foreground">
            {formatDate(today)}
          </span>
        </div>
        {todayQuery.isPending ? (
          <LoadingCard label={t("loading")} />
        ) : todayMeals.length === 0 ? (
          <Card className="grid place-items-center gap-2 p-6 text-center">
            <Utensils className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("noToday")}</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {todayMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("menuHistory")}</CardTitle>
          <CardDescription>{t("menuHistoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {allQuery.isPending ? (
            <LoadingCard label={t("loading")} />
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              pageSize={15}
              emptyMessage={t("table.empty")}
              toolbar={(table) => (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t("table.search")}
                        className="h-9 w-[190px] pl-8"
                      />
                    </div>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("table.allTypes")}</SelectItem>
                        {mealTypes.map((item) => (
                          <SelectItem key={item} value={item}>
                            {t(mealTypeLabelKey(item))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("table.allStatuses")}
                        </SelectItem>
                        <SelectItem value="published">
                          {t("status.published")}
                        </SelectItem>
                        <SelectItem value="draft">{t("status.draft")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <PeriodToggle value={period} onValueChange={setPeriod} t={t} />
                    {period === "month" ? (
                      <MonthPicker
                        value={month}
                        onValueChange={setMonth}
                        className="w-[160px]"
                      />
                    ) : period === "day" ? (
                      <DatePicker
                        value={day}
                        onValueChange={setDay}
                        className="w-[160px]"
                      />
                    ) : null}
                  </div>
                  <DataTableViewOptions table={table} />
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function buildColumns(
  t: TFunction<"meals">,
  router: ReturnType<typeof useRouter>,
): ColumnDef<MealPostSummary>[] {
  return [
    {
      id: "meal",
      accessorFn: (meal) => meal.menuText,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.menu")} />
      ),
      cell: ({ row }) => {
        const meal = row.original;
        const classNames = meal.classes.map((c) => c.name).join(", ");
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
              {meal.coverMedia ? (
                <SignedMealImage
                  mediaAssetId={meal.coverMedia.assetId}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="grid h-full w-full place-items-center">
                  <Utensils className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
            </div>
            <div className="min-w-0 max-w-[280px]">
              <p className="truncate font-medium">{meal.menuText}</p>
              <p className="truncate text-xs text-muted-foreground">
                {classNames || t(mealAudienceLabelKey(meal.audienceType))}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "mealType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.type")} />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">
          {t(mealTypeLabelKey(row.original.mealType))}
        </Badge>
      ),
    },
    {
      accessorKey: "mealDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.date")} />
      ),
      cell: ({ row }) => (
        <span className="nums text-sm">{formatDate(row.original.mealDate)}</span>
      ),
    },
    {
      id: "audience",
      accessorFn: (meal) => meal.audienceType,
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.audience")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {t(mealAudienceLabelKey(row.original.audienceType))}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.status")} />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "draft" ? "secondary" : "success"}
        >
          {t(mealStatusLabelKey(row.original.status))}
        </Badge>
      ),
    },
    {
      accessorKey: "mediaCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.photos")} />
      ),
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          {row.original.mediaCount}
        </span>
      ),
    },
    {
      id: "open",
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">{t("table.open")}</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/dashboard/meals/${row.original.id}`)}
          >
            {t("table.open")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

function PeriodToggle({
  value,
  onValueChange,
  t,
}: {
  value: Period;
  onValueChange: (value: Period) => void;
  t: TFunction<"meals">;
}) {
  const options: { key: Period; label: string }[] = [
    { key: "all", label: t("table.period.all") },
    { key: "month", label: t("table.period.month") },
    { key: "day", label: t("table.period.day") },
  ];
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onValueChange(option.key)}
          aria-pressed={value === option.key}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition",
            value === option.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
