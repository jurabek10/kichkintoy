"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { AdminCronRun, AdminCronRunsResponse } from "@kichkintoy/shared";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDateNumeric, formatDateTime } from "@/lib/format";
import { CronStatusBadge, durationMs, formatDuration } from "./cron-ui";

export function CronRunsTable({
  data,
  onPageChange,
  detail = false,
  toolbar,
}: {
  data: AdminCronRunsResponse;
  onPageChange: (page: number) => void;
  detail?: boolean;
  toolbar?: React.ReactNode;
}) {
  const { t, i18n } = useLayoutTranslation("admin");
  const columns = useMemo<ColumnDef<AdminCronRun>[]>(
    () => [
      {
        id: "number",
        header: () => (
          <span className="text-xs">{t("crons.table.number")}</span>
        ),
        cell: ({ row }) => (
          <span className="nums text-xs text-muted-foreground">
            {(data.page - 1) * data.pageSize + row.index + 1}
          </span>
        ),
      },
      ...(!detail
        ? [
            {
              accessorKey: "jobName",
              header: ({ column }) => (
                <DataTableColumnHeader
                  column={column}
                  title={t("crons.table.job")}
                />
              ),
              cell: ({ row }) => (
                <Link
                  href={`/admin/crons/${encodeURIComponent(row.original.jobName)}`}
                  className="group flex min-w-0 items-start gap-1.5 text-primary hover:underline"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">
                      {t(`crons.jobNames.${row.original.jobName}`)}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">
                      {row.original.jobName}
                    </span>
                  </span>
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                </Link>
              ),
            } satisfies ColumnDef<AdminCronRun>,
          ]
        : []),
      {
        accessorKey: "runDate",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("crons.table.runDate")}
          />
        ),
        cell: ({ row }) => (
          <span className="nums whitespace-nowrap text-sm">
            {formatDateNumeric(row.original.runDate)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("crons.table.status")}
          />
        ),
        cell: ({ row }) => (
          <CronStatusBadge status={row.original.status} t={t} />
        ),
      },
      {
        accessorKey: "sentCount",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("crons.table.sent")}
          />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm">{row.original.sentCount}</span>
        ),
      },
      {
        id: "duration",
        header: () => (
          <span className="text-xs">{t("crons.table.duration")}</span>
        ),
        cell: ({ row }) => (
          <span className="nums whitespace-nowrap text-sm text-muted-foreground">
            {formatDuration(durationMs(row.original), i18n.language)}
          </span>
        ),
      },
      {
        accessorKey: "startedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("crons.table.startedAt")}
          />
        ),
        cell: ({ row }) => (
          <span className="nums whitespace-nowrap text-xs text-muted-foreground">
            {formatDateTime(row.original.startedAt)}
          </span>
        ),
      },
      ...(detail
        ? [
            {
              accessorKey: "finishedAt",
              header: ({ column }) => (
                <DataTableColumnHeader
                  column={column}
                  title={t("crons.table.finishedAt")}
                />
              ),
              cell: ({ row }) => (
                <span className="nums whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTime(row.original.finishedAt)}
                </span>
              ),
            } satisfies ColumnDef<AdminCronRun>,
            {
              accessorKey: "error",
              header: ({ column }) => (
                <DataTableColumnHeader
                  column={column}
                  title={t("crons.table.error")}
                />
              ),
              cell: ({ row }) =>
                row.original.error ? (
                  <details className="max-w-[260px] text-xs text-destructive">
                    <summary className="cursor-pointer truncate font-semibold">
                      {row.original.error}
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-destructive/5 p-2 leading-5">
                      {row.original.error}
                    </p>
                  </details>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            } satisfies ColumnDef<AdminCronRun>,
          ]
        : []),
    ],
    [data.page, data.pageSize, detail, i18n.language, t],
  );

  return (
    <DataTable
      columns={columns}
      data={data.items}
      pageSize={data.pageSize}
      emptyMessage={t("crons.table.empty")}
      pageLabel={(page, total) => t("crons.table.page", { page, total })}
      toolbar={toolbar ? () => toolbar : undefined}
      serverPagination={{
        pageIndex: data.page - 1,
        pageCount: Math.max(data.totalPages, 1),
        onPageIndexChange: (pageIndex) => onPageChange(pageIndex + 1),
      }}
      tableClassName="table-fixed"
    />
  );
}
