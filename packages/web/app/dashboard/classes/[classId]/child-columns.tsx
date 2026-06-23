"use client";

import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import type { ColumnDef, Table as TableInstance } from "@tanstack/react-table";
import type { TFunction } from "i18next";
import type { ClassRosterChild } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChildAvatar } from "@/components/child-avatar";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDateNumeric, genderLabel } from "@/lib/format";

/**
 * The children roster columns — a running number, name + avatar, sex, guardian
 * contact, birthday, joined date, payment, and row actions. Shared verbatim by
 * the director and the teacher so both rooms read the same table; the only
 * difference is whose data feeds it and who is allowed to delete (enforced
 * server-side). The "#" counts across pages, so after filtering by sex the last
 * number is the count — no need to tally rows by hand.
 */
export function buildChildColumns({
  t,
  tApp,
  onDelete,
  showJoined = true,
}: {
  t: TFunction<"classes">;
  tApp: TFunction<"app">;
  onDelete: (child: { childId: string; name: string }) => void;
  /** Show the "Joined" date column. Off for the teacher's narrower table. */
  showJoined?: boolean;
}): ColumnDef<ClassRosterChild>[] {
  return [
    {
      id: "index",
      header: () => (
        <span className="text-muted-foreground" aria-label={t("childrenTable.number")}>
          #
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row, table }) => {
        // Position within the filtered + sorted rows (all pages), so the count
        // is continuous and survives pagination.
        const position =
          table.getSortedRowModel().rows.findIndex((r) => r.id === row.id) + 1;
        return (
          <span className="nums tabular-nums text-sm font-semibold text-muted-foreground">
            {position}
          </span>
        );
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("childrenTable.name")} />
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <ChildAvatar
            name={row.original.name}
            photoUrl={row.original.photoUrl}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {translatedGender(row.original.gender, t)}
            </p>
          </div>
        </div>
      ),
    },
    {
      // Hidden by default (the sex shows under the name) but kept so the
      // toolbar's sex filter has a column to act on — filter to Boys/Girls and
      // the running "#" gives the count.
      id: "gender",
      accessorFn: (child) => child.gender ?? "",
      filterFn: "equalsString",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("childrenTable.gender")}
        />
      ),
      cell: ({ row }) => <GenderBadge gender={row.original.gender} t={t} />,
    },
    {
      id: "phone",
      accessorFn: (child) => child.guardianPhone ?? "",
      enableSorting: false,
      header: t("childrenTable.parent"),
      cell: ({ row }) => {
        const { guardianPhone, guardianName, guardianRelation } = row.original;
        const relation = guardianRelation
          ? tApp(`signup.relationshipOptions.${guardianRelation}`, {
              defaultValue: guardianRelation,
            })
          : null;
        return (
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-semibold text-foreground">
                {guardianName ?? "—"}
              </span>
              {relation ? (
                <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                  {relation}
                </span>
              ) : null}
            </div>
            {guardianPhone ? (
              <a
                href={`tel:${guardianPhone}`}
                dir="ltr"
                className="nums mt-0.5 block w-fit text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
              >
                {guardianPhone}
              </a>
            ) : (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {t("childrenTable.noPhone")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "dateOfBirth",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("childrenTable.birthday")}
        />
      ),
      cell: ({ row }) => (
        <span className="nums tabular-nums text-muted-foreground">
          {formatDateNumeric(row.original.dateOfBirth)}
        </span>
      ),
    },
    ...(showJoined
      ? [
          {
            accessorKey: "joinedAt",
            header: ({ column }) => (
              <DataTableColumnHeader
                column={column}
                title={t("childrenTable.joined")}
              />
            ),
            cell: ({ row }) => (
              <span className="nums tabular-nums text-muted-foreground">
                {formatDateNumeric(row.original.joinedAt)}
              </span>
            ),
          } satisfies ColumnDef<ClassRosterChild>,
        ]
      : []),
    {
      id: "paymentStatus",
      accessorFn: () => t("childrenTable.paymentComingSoon"),
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("childrenTable.payment")}
        />
      ),
      cell: () => (
        <Badge variant="outline">{t("childrenTable.paymentComingSoon")}</Badge>
      ),
    },
    {
      id: "actions",
      header: () => (
        <span className="block text-right">{t("childrenTable.actions")}</span>
      ),
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href={`/dashboard/children/${row.original.childId}`}>
              <Eye className="h-4 w-4" />
              {t("childrenTable.viewProfile")}
            </Link>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("childDetail.delete")}
            title={t("childDetail.delete")}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() =>
              onDelete({
                childId: row.original.childId,
                name: row.original.name,
              })
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}

export function translatedGender(
  value: string | null | undefined,
  t: TFunction<"classes">,
) {
  if (value === "boy") return t("gender.boy");
  if (value === "girl") return t("gender.girl");
  if (value === "prefer_not_to_say") return t("gender.prefer_not_to_say");
  return genderLabel(value);
}

/** A colored sex pill — sky for boys, bubblegum for girls — so a glance down
 *  the column separates the two without reading every label. */
function GenderBadge({
  gender,
  t,
}: {
  gender: string | null | undefined;
  t: TFunction<"classes">;
}) {
  const tone =
    gender === "boy"
      ? "bg-sky text-sky-ink"
      : gender === "girl"
        ? "bg-bubblegum text-bubblegum-ink"
        : "bg-secondary text-muted-foreground";
  if (gender !== "boy" && gender !== "girl" && gender !== "prefer_not_to_say") {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone,
      )}
    >
      {translatedGender(gender, t)}
    </span>
  );
}

/**
 * The roster table toolbar: name search, a sex filter (All / Boys / Girls /
 * Prefer not to say), and the column visibility menu. Shared by both rooms so
 * the controls — and the "filter then read the last #" trick — work the same.
 */
export function ChildrenTableToolbar({
  table,
  t,
}: {
  table: TableInstance<ClassRosterChild>;
  t: TFunction<"classes">;
}) {
  const gender =
    (table.getColumn("gender")?.getFilterValue() as string) ?? "all";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          placeholder={t("childrenTable.search")}
          className="h-9 sm:w-[240px]"
        />
        <Select
          value={gender}
          onValueChange={(value) =>
            table
              .getColumn("gender")
              ?.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("childrenTable.allGenders")}</SelectItem>
            <SelectItem value="boy">{t("gender.boy")}</SelectItem>
            <SelectItem value="girl">{t("gender.girl")}</SelectItem>
            <SelectItem value="prefer_not_to_say">
              {t("gender.prefer_not_to_say")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
