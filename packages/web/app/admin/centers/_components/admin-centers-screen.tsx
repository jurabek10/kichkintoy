"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Building2, ChevronRight, Pencil, Plus, Search } from "lucide-react";
import type { AdminCenterRow } from "@kichkintoy/shared";
import { queryKeys } from "@/lib/query-keys";
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
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KidsLoader } from "@/components/kids-loader";
import { SignedAvatar } from "@/components/signed-avatar";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDateNumeric } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { centerStatusVariant } from "../../_components/center-status";

const statusFilterValues = ["active", "suspended"] as const;

export function AdminCentersScreen() {
  const { t } = useLayoutTranslation("admin");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");

  const {
    data: centers = [],
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: queryKeys.admin.centers(),
    queryFn: () => orpc.admin.centers.list({}),
  });

  const regionOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const center of centers) {
      if (center.region) unique.add(center.region);
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [centers]);

  const columns = useMemo<ColumnDef<AdminCenterRow>[]>(
    () => [
      {
        id: "number",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="text-xs">{t("centers.table.number")}</span>,
        cell: ({ row, table }) => {
          // Running number across pages: page offset + position on this page.
          const { pageIndex, pageSize } = table.getState().pagination;
          const visibleIndex = table
            .getRowModel()
            .rows.findIndex((candidate) => candidate.id === row.id);
          return (
            <span className="nums text-xs text-muted-foreground">
              {pageIndex * pageSize + visibleIndex + 1}
            </span>
          );
        },
      },
      {
        id: "center",
        accessorFn: (center) => `${center.name} ${center.centerCode}`,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("centers.table.center")} />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold">{row.original.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {row.original.centerCode}
            </p>
          </div>
        ),
      },
      {
        id: "region",
        accessorFn: (center) => center.region ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("centers.table.region")} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {[row.original.region, row.original.district]
              .filter(Boolean)
              .join(" / ") || "—"}
          </span>
        ),
      },
      {
        id: "director",
        accessorFn: (center) => center.director?.fullName ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("centers.table.director")}
          />
        ),
        cell: ({ row }) => {
          const director = row.original.director;
          if (!director) {
            return <Badge variant="warning">{t("centers.noDirector")}</Badge>;
          }
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              <SignedAvatar
                mediaAssetId={director.avatarUrl}
                name={director.fullName}
                className="h-8 w-8 shrink-0"
                textClassName="text-[10px]"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {director.fullName}
                </p>
                <p
                  dir="ltr"
                  className="nums truncate text-left text-xs text-muted-foreground"
                >
                  {director.phone ?? "—"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "kids",
        accessorFn: (center) => center.counts.children,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("centers.table.kids")} />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm">{row.original.counts.children}</span>
        ),
      },
      {
        id: "teachers",
        accessorFn: (center) => center.counts.teachers,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("centers.table.teachers")}
          />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm">{row.original.counts.teachers}</span>
        ),
      },
      {
        id: "classes",
        accessorFn: (center) => center.counts.classes,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("centers.table.classes")}
          />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm">{row.original.counts.classes}</span>
        ),
      },
      {
        id: "status",
        accessorFn: (center) => center.status,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("centers.table.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={centerStatusVariant[row.original.status]}>
            {t(`status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("centers.table.created")}
          />
        ),
        cell: ({ row }) => (
          <span className="nums text-sm text-muted-foreground">
            {formatDateNumeric(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        header: () => <span className="sr-only">{t("centers.table.open")}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title={t("detail.actions.edit")}
            >
              <Link
                href={`/admin/centers/${row.original.id}?edit=1`}
                aria-label={t("detail.actions.edit")}
                onClick={(event) => event.stopPropagation()}
              >
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-primary hover:text-primary"
            >
              <Link
                href={`/admin/centers/${row.original.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                {t("centers.table.open")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  const query = search.trim().toLowerCase();
  const rows = centers.filter((center) => {
    if (query) {
      const haystack = `${center.name} ${center.centerCode}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (region !== "all" && center.region !== region) return false;
    if (status !== "all" && center.status !== status) return false;
    return true;
  });

  const error = loadError ? toApiError(loadError).message : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{t("centers.title")}</CardTitle>
            <CardDescription>{t("centers.description")}</CardDescription>
          </div>
          <Button asChild className="shrink-0 gap-2">
            <Link href="/admin/centers/new">
              <Plus className="h-4 w-4" />
              {t("centers.addCenter")}
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <KidsLoader label={t("loading")} size="sm" />
          </CardContent>
        </Card>
      ) : centers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold">{t("overview.newest.empty")}</p>
              <p className="text-sm text-muted-foreground">
                {t("form.createDescription")}
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link href="/admin/centers/new">
                <Plus className="h-4 w-4" />
                {t("centers.addCenter")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <DataTable
              columns={columns}
              data={rows}
              pageSize={10}
              emptyMessage={t("centers.table.empty")}
              pageLabel={(page, total) =>
                t("centers.table.page", { page, total })
              }
              onRowClick={(row) => router.push(`/admin/centers/${row.id}`)}
              toolbar={() => (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t("centers.table.search")}
                      className="h-9 w-[220px] pl-8"
                    />
                  </div>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="h-9 w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("centers.table.allRegions")}
                      </SelectItem>
                      {regionOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("centers.table.allStatuses")}
                      </SelectItem>
                      {statusFilterValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`status.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
