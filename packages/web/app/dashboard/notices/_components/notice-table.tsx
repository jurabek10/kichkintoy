"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Megaphone,
  Pin,
  Search,
  Star,
  Users,
} from "lucide-react";
import type { NoticeSummary } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type NoticeTableMode = "parent" | "staff";

export function NoticeTable({
  notices,
  mode,
  search,
  onSearchChange,
  t,
}: {
  notices: NoticeSummary[];
  mode: NoticeTableMode;
  search: string;
  onSearchChange: (value: string) => void;
  t: TFunction<"notices">;
}) {
  const router = useRouter();
  const columns = useMemo<ColumnDef<NoticeSummary>[]>(
    () => buildColumns({ mode, router, t }),
    [mode, router, t],
  );

  return (
    <DataTable
      columns={columns}
      data={notices}
      pageSize={15}
      emptyMessage={t("table.empty")}
      tableClassName="table-fixed"
      onRowClick={(notice) => router.push(`/dashboard/notices/${notice.id}`)}
      rowClassName={(notice) =>
        cn(
          !notice.myReadAt && mode === "parent" && "bg-sky/[0.07]",
          notice.isImportant && mode === "staff" && "bg-coral/[0.04]",
        )
      }
      toolbar={(table) => (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-[280px] sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={t("table.search")}
                className="h-9 w-full rounded-xl bg-muted/60 pl-8 sm:w-[280px]"
              />
            </div>
            <DataTableFacetedFilter
              column={table.getColumn("audience")}
              title={t("table.audience")}
              options={[
                { label: t("audience.center"), value: "center" },
                { label: t("audience.class"), value: "class" },
                { label: t("audience.child"), value: "child" },
              ]}
            />
          </div>
          <DataTableViewOptions table={table} />
        </div>
      )}
    />
  );
}

function buildColumns({
  mode,
  router,
  t,
}: {
  mode: NoticeTableMode;
  router: ReturnType<typeof useRouter>;
  t: TFunction<"notices">;
}): ColumnDef<NoticeSummary>[] {
  const columns: ColumnDef<NoticeSummary>[] = [
    {
      id: "notice",
      accessorFn: (notice) => notice.title,
      enableHiding: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.notice")} />
      ),
      cell: ({ row }) => (
        <NoticeCell notice={row.original} mode={mode} t={t} />
      ),
    },
    {
      id: "audience",
      accessorFn: (notice) => notice.targetType,
      filterFn: (row, id, value) => {
        const selected = value as string[] | undefined;
        if (!selected?.length) return true;
        return selected.includes(row.getValue(id));
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.audience")} />
      ),
      cell: ({ row }) => (
        <AudienceCell notice={row.original} mode={mode} t={t} />
      ),
    },
    {
      id: "createdAt",
      accessorFn: (notice) => notice.createdAt,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.createdAt")} />
      ),
      cell: ({ row }) => (
        <CreatedAtCell notice={row.original} mode={mode} t={t} />
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
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/dashboard/notices/${row.original.id}`);
            }}
          >
            {t("table.open")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (mode === "staff") {
    columns.splice(1, 0, {
      id: "status",
      accessorFn: (notice) => notice.status,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("table.status")} />
      ),
      cell: ({ row }) => <StatusBadge notice={row.original} t={t} />,
    });
  }

  return columns;
}

function NoticeCell({
  notice,
  mode,
  t,
}: {
  notice: NoticeSummary;
  mode: NoticeTableMode;
  t: TFunction<"notices">;
}) {
  const unread = mode === "parent" && !notice.myReadAt;
  const KindIcon = notice.kind === "survey" ? ClipboardList : Megaphone;

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full",
          notice.isImportant
            ? "bg-coral text-coral-ink"
            : notice.isPinned
              ? "bg-sky/25 text-sky-ink"
              : unread
                ? "bg-sky text-sky-ink"
                : "bg-muted text-muted-foreground",
        )}
      >
        {notice.isImportant ? (
          <Star className="h-4 w-4 fill-current" />
        ) : notice.isPinned ? (
          <Bookmark className="h-4 w-4 fill-current" />
        ) : unread ? (
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        ) : (
          <KindIcon className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <p
            className={cn(
              "truncate leading-tight text-foreground",
              unread ? "font-extrabold" : "font-semibold",
            )}
          >
            {notice.title}
          </p>
          {unread ? (
            <Badge className="shrink-0 bg-sky text-sky-ink hover:bg-sky">
              {t("badges.new")}
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {notice.bodyPreview}
        </p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-muted-foreground">
          {notice.isPinned ? (
            <span className="inline-flex items-center gap-1 text-sky-ink">
              <Pin className="h-3 w-3" />
              {t("badges.pinned")}
            </span>
          ) : null}
          {notice.isImportant ? (
            <span className="inline-flex items-center gap-1 text-coral-ink">
              <Star className="h-3 w-3 fill-current" />
              {t("badges.important")}
            </span>
          ) : null}
          {notice.commentCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {notice.commentCount}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AudienceCell({
  notice,
  mode,
  t,
}: {
  notice: NoticeSummary;
  mode: NoticeTableMode;
  t: TFunction<"notices">;
}) {
  const label =
    mode === "parent" && notice.child
      ? notice.child.name
      : notice.targets[0]?.label ?? t(audienceKey(notice.targetType));
  const extra =
    mode === "staff" && notice.targets.length > 1
      ? `+${notice.targets.length - 1}`
      : null;

  return (
    <div className="min-w-0 text-sm">
      <p className="truncate font-medium text-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
        <Users className="h-3 w-3 shrink-0" />
        <span className="truncate">{t(audienceKey(notice.targetType))}</span>
        {extra ? <span className="shrink-0">{extra}</span> : null}
      </p>
    </div>
  );
}

function CreatedAtCell({
  notice,
  mode,
  t,
}: {
  notice: NoticeSummary;
  mode: NoticeTableMode;
  t: TFunction<"notices">;
}) {
  if (mode === "parent") {
    const confirmed = !!notice.myConfirmedAt;
    const needsConfirm = notice.requiresConfirmation && !confirmed;

    return (
      <div className="min-w-0 text-sm">
        <p className="truncate text-muted-foreground">
          {formatDateTime(notice.createdAt)}
        </p>
        {notice.requiresConfirmation ? (
          <p
            className={cn(
              "mt-1 inline-flex items-center gap-1 truncate text-xs font-bold",
              needsConfirm ? "text-sky-ink" : "text-mint-ink",
            )}
          >
            {needsConfirm ? (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">
              {needsConfirm ? t("badges.confirmation") : t("badges.confirmed")}
            </span>
          </p>
        ) : null}
      </div>
    );
  }

  if (notice.status === "published") {
    return (
      <div className="min-w-0 text-sm">
        <p className="truncate text-muted-foreground">
          {formatDateTime(notice.createdAt)}
        </p>
        <p className="mt-1 truncate text-xs font-semibold text-foreground">
          {t("readCount", {
            read: notice.readCount,
            total: notice.recipientCount,
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 text-sm">
      <p className="truncate text-muted-foreground">
        {formatDateTime(notice.createdAt)}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
        {notice.status === "scheduled" ? t("status.scheduled") : t("draftNotSent")}
      </p>
    </div>
  );
}

function StatusBadge({
  notice,
  t,
}: {
  notice: NoticeSummary;
  t: TFunction<"notices">;
}) {
  return (
    <Badge variant={statusVariant(notice.status)}>
      {t(statusKey(notice.status))}
    </Badge>
  );
}

function statusVariant(status: string) {
  if (status === "published") return "success";
  if (status === "scheduled") return "warning";
  return "secondary";
}

function statusKey(value: string) {
  if (value === "published") return "status.published";
  if (value === "scheduled") return "status.scheduled";
  return "status.draft";
}

function audienceKey(value: string) {
  if (value === "center") return "audience.center";
  if (value === "class") return "audience.class";
  return "audience.child";
}
