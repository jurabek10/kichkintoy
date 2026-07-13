"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, FileLock2, LockKeyhole, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageAvatar } from "../../messages/_components/message-avatar";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { ComplaintStatusBadge, formatComplaintDate } from "./complaint-ui";

export function ComplaintDetailView({ complaintId }: { complaintId: string }) {
  const { t, i18n } = useLayoutTranslation("complaints");
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [resolution, setResolution] = useState("");
  const query = useQuery({ queryKey: queryKeys.complaints.detail(complaintId), queryFn: () => orpc.complaints.detail({ complaintId }) });
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all() }); void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.detail(complaintId) }); };
  const replyMutation = useMutation({ mutationFn: () => orpc.complaints.reply({ complaintId, body: reply }), onSuccess: () => { setReply(""); refresh(); } });
  const statusMutation = useMutation({ mutationFn: (input: { status: "in_progress" | "resolved"; resolutionNote?: string }) => orpc.complaints.setStatus({ complaintId, ...input }), onSuccess: () => { setResolution(""); refresh(); } });
  const withdraw = useMutation({ mutationFn: () => orpc.complaints.withdraw({ complaintId }), onSuccess: refresh });
  const data = query.data;
  const timeline = useMemo(() => data ? [...data.replies.map((item) => ({ type: "reply" as const, at: item.createdAt, item })), ...data.statusEvents.map((item) => ({ type: "status" as const, at: item.createdAt, item }))].sort((a, b) => a.at.localeCompare(b.at)) : [], [data]);
  if (query.isLoading || !data) return <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">{t("loading")}</div>;
  const isParent = session?.user.role === "parent";
  const canReply = data.status !== "withdrawn" && (isParent || data.status !== "resolved");
  return <div className="mx-auto max-w-4xl space-y-5">
    <Link href="/dashboard/complaints" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("back")}</Link>
    <header className="rounded-2xl border-l-4 border-amber-500 bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 flex flex-wrap items-center gap-2"><ComplaintStatusBadge status={data.status} t={t} />{data.visibility === "director_only" ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><LockKeyhole className="h-3.5 w-3.5" />{t("confidential")}</span> : null}</div><h2 className="text-2xl font-bold tracking-tight">{data.subject}</h2><p className="mt-1 text-sm text-muted-foreground">{data.child.displayName} · {data.classLabel ?? "—"} · {t(`categories.${data.category}`)}</p></div><span className="text-xs text-muted-foreground">{formatComplaintDate(data.createdAt, i18n.language)}</span></div></header>
    <section aria-labelledby="timeline-heading"><div className="mb-3 flex items-center gap-2"><FileLock2 className="h-5 w-5 text-indigo-700" /><h3 id="timeline-heading" className="font-bold">{t("timeline")}</h3></div><div className="relative space-y-4 before:absolute before:bottom-6 before:left-[21px] before:top-6 before:w-px before:bg-indigo-200">
      <TimelineCard name={data.parent.displayName} photo={data.parent} at={data.createdAt} language={i18n.language} title={t("original")}><p className="whitespace-pre-wrap text-sm leading-6">{data.body}</p></TimelineCard>
      {timeline.map((entry) => entry.type === "reply" ? <TimelineCard key={`reply-${entry.item.id}`} name={entry.item.sender.displayName} photo={entry.item.sender} at={entry.at} language={i18n.language} title={t("reply")}><p className="whitespace-pre-wrap text-sm leading-6">{entry.item.body}</p></TimelineCard> : <TimelineCard key={`status-${entry.item.id}`} name={entry.item.actor.displayName} photo={entry.item.actor} at={entry.at} language={i18n.language} title={t("changedStatus", { from: t(`statuses.${entry.item.fromStatus}`), to: t(`statuses.${entry.item.toStatus}`) })}>{entry.item.note ? <p className="whitespace-pre-wrap rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">{entry.item.note}</p> : null}</TimelineCard>)}
    </div></section>
    {canReply ? <Card><CardContent className="space-y-3 p-4"><Textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} placeholder={t("replyPlaceholder")} /><div className="flex justify-end"><Button disabled={!reply.trim() || replyMutation.isPending} onClick={() => replyMutation.mutate()} className="bg-indigo-700 hover:bg-indigo-800"><MessageSquareText className="mr-2 h-4 w-4" />{t("reply")}</Button></div></CardContent></Card> : null}
    <div className="flex flex-wrap justify-end gap-2">{!isParent && data.status !== "withdrawn" && data.status !== "resolved" ? <><Button variant="outline" disabled={data.status === "in_progress"} onClick={() => statusMutation.mutate({ status: "in_progress" })}>{t("markInProgress")}</Button><Dialog><DialogTrigger asChild><Button>{t("resolve")}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{t("resolve")}</DialogTitle></DialogHeader><Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} maxLength={1000} placeholder={t("resolutionPlaceholder")} /><DialogFooter><Button disabled={!resolution.trim() || statusMutation.isPending} onClick={() => statusMutation.mutate({ status: "resolved", resolutionNote: resolution })}>{t("resolve")}</Button></DialogFooter></DialogContent></Dialog></> : null}{isParent && data.status !== "resolved" && data.status !== "withdrawn" ? <Button variant="outline" className="text-destructive" onClick={() => withdraw.mutate()}>{t("withdraw")}</Button> : null}</div>
    {(replyMutation.error || statusMutation.error || withdraw.error) ? <p className="text-right text-sm text-destructive">{t("actionError")}</p> : null}
  </div>;
}

function TimelineCard({ name, photo, at, language, title, children }: { name: string; photo: { photoMediaAssetId: string | null; photoUrl: string | null }; at: string; language: string; title: string; children: React.ReactNode }) {
  return <article className="relative flex gap-3"><MessageAvatar name={name} photoMediaAssetId={photo.photoMediaAssetId} photoUrl={photo.photoUrl} className="relative z-10 h-11 w-11 border-2 border-white" /><div className="min-w-0 flex-1 rounded-2xl border bg-card p-4 shadow-sm"><div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{name}</p><p className="text-xs font-medium text-indigo-700">{title}</p></div><time className="text-xs text-muted-foreground">{formatComplaintDate(at, language)}</time></div>{children}</div></article>;
}
