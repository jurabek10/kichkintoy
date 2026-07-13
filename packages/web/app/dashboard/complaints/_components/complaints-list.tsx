"use client";
import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { ComplaintCategory, ComplaintStatus, ComplaintSummary } from "@kichkintoy/shared";
import { LockKeyhole, Plus, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageAvatar } from "../../messages/_components/message-avatar";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { ComplaintStatusBadge, formatComplaintDate } from "./complaint-ui";

export function ComplaintsList() {
  const { t, i18n } = useLayoutTranslation("complaints");
  const { session } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ComplaintStatus | "all">("all");
  const [category, setCategory] = useState<ComplaintCategory | "all">("all");
  const [classId, setClassId] = useState("all");
  const [period, setPeriod] = useState<"all" | "month" | "day">("all");
  const role = session?.user.role;
  const centerId = session?.membership.centerId;
  const from = useMemo(() => {
    if (period === "all") return undefined;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    if (period === "month") date.setDate(1);
    return date.toISOString();
  }, [period]);
  const parentInput = status === "all" ? {} : { status };
  const staffInput = {
    centerId: centerId!,
    ...(status === "all" ? {} : { status }),
    ...(category === "all" ? {} : { category }),
    ...(classId === "all" ? {} : { classId }),
    ...(from ? { from } : {}),
  };
  const query = useInfiniteQuery({
    queryKey: role === "parent" ? queryKeys.complaints.parentList(parentInput) : queryKeys.complaints.staffList(staffInput),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => role === "parent"
      ? orpc.complaints.parentList({ ...parentInput, cursor: pageParam ?? undefined, limit: 10 })
      : orpc.complaints.staffList({ ...staffInput, cursor: pageParam ?? undefined, limit: 10 }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(role && (role === "parent" || centerId)),
  });
  const rows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return (query.data?.pages.flatMap((page) => page.items) ?? []).filter((row) => !needle || `${row.child.displayName} ${row.subject} ${row.classLabel ?? ""}`.toLocaleLowerCase().includes(needle));
  }, [query.data, search]);
  const classOptions = useMemo(() => [...new Map((query.data?.pages.flatMap((page) => page.items) ?? []).filter((row) => row.classId && row.classLabel).map((row) => [row.classId!, row.classLabel!])).entries()], [query.data]);
  const columns = useMemo<ColumnDef<ComplaintSummary>[]>(() => [
    { id: "number", header: "#", cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span> },
    { id: "child", accessorFn: (row) => row.child.displayName, header: t("child"), cell: ({ row }) => <div className="flex items-center gap-2"><MessageAvatar name={row.original.child.displayName} photoMediaAssetId={row.original.child.photoMediaAssetId} photoUrl={row.original.child.photoUrl} className="h-9 w-9 rounded-xl" /><span className="font-semibold">{row.original.child.displayName}</span></div> },
    { accessorKey: "classLabel", header: t("class"), cell: ({ row }) => <span className="text-muted-foreground">{row.original.classLabel ?? "—"}</span> },
    { accessorKey: "category", header: t("category"), cell: ({ row }) => t(`categories.${row.original.category}`) },
    { accessorKey: "subject", header: t("subject"), cell: ({ row }) => <div className="flex max-w-[260px] items-center gap-1.5"><span className="truncate font-medium">{row.original.subject}</span>{row.original.visibility === "director_only" ? <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-amber-700" /> : null}</div> },
    { accessorKey: "status", header: t("status"), cell: ({ row }) => <ComplaintStatusBadge status={row.original.status} t={t} /> },
    { accessorKey: "createdAt", header: t("filed"), cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatComplaintDate(row.original.createdAt, i18n.language)}</span> },
  ], [t, i18n.language]);
  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3 border-l-4 border-amber-500 pl-4">
      <div><p className="text-sm font-semibold text-muted-foreground">{t("subtitle")}</p><h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2></div>
      {role === "parent" ? <Button asChild className="bg-indigo-700 hover:bg-indigo-800"><Link href="/dashboard/complaints/new"><Plus className="mr-2 h-4 w-4" />{t("new")}</Link></Button> : null}
    </div>
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} className="pl-9" /></div>
      <Select value={status} onValueChange={(value) => setStatus(value as ComplaintStatus | "all")}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("all")}</SelectItem>{(["open", "in_progress", "resolved", "withdrawn"] as const).map((item) => <SelectItem key={item} value={item}>{t(`statuses.${item}`)}</SelectItem>)}</SelectContent></Select>
      {role !== "parent" ? <><Select value={category} onValueChange={(value) => setCategory(value as ComplaintCategory | "all")}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("all")}</SelectItem>{(["meals", "safety", "staff_behavior", "fees", "facility", "health", "curriculum", "other"] as const).map((item) => <SelectItem key={item} value={item}>{t(`categories.${item}`)}</SelectItem>)}</SelectContent></Select><Select value={classId} onValueChange={setClassId}><SelectTrigger className="w-40"><SelectValue placeholder={t("class")} /></SelectTrigger><SelectContent><SelectItem value="all">{t("all")}</SelectItem>{classOptions.map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select><Select value={period} onValueChange={(value) => setPeriod(value as "all" | "month" | "day")}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("all")}</SelectItem><SelectItem value="month">{t("month")}</SelectItem><SelectItem value="day">{t("day")}</SelectItem></SelectContent></Select></> : null}
    </div>
    {query.isLoading ? <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">{t("loading")}</div> : rows.length ? <><div className="hidden md:block"><DataTable columns={columns} data={rows} pageSize={10} emptyMessage={t("empty")} onRowClick={(row) => router.push(`/dashboard/complaints/${row.id}`)} /></div><div className="space-y-2 md:hidden">{rows.map((row) => <button key={row.id} onClick={() => router.push(`/dashboard/complaints/${row.id}`)} className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left"><MessageAvatar name={row.child.displayName} photoMediaAssetId={row.child.photoMediaAssetId} photoUrl={row.child.photoUrl} /><span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 font-semibold"><span className="truncate">{row.subject}</span>{row.visibility === "director_only" ? <LockKeyhole className="h-3.5 w-3.5 text-amber-700" /> : null}</span><span className="block truncate text-xs text-muted-foreground">{row.child.displayName} · {t(`categories.${row.category}`)}</span></span><ComplaintStatusBadge status={row.status} t={t} /></button>)}</div></> : <div className="grid min-h-56 justify-items-center content-center gap-2 rounded-2xl border border-dashed bg-card p-8 text-center"><ShieldAlert className="h-9 w-9 text-amber-600" /><p className="font-semibold">{t("empty")}</p><p className="text-sm text-muted-foreground">{t("emptyBody")}</p></div>}
    {query.hasNextPage ? <Button variant="outline" onClick={() => query.fetchNextPage()}>{t("loadMore")}</Button> : null}
  </section>;
}
