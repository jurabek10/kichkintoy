"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Info, LockKeyhole, Users } from "lucide-react";
import type { ComplaintCategory, ComplaintVisibility } from "@kichkintoy/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const categories = ["meals", "safety", "staff_behavior", "fees", "facility", "health", "curriculum", "other"] as const;

export function ComplaintComposer() {
  const { t } = useLayoutTranslation("complaints");
  const router = useRouter();
  const queryClient = useQueryClient();
  const children = useQuery({ queryKey: queryKeys.profile.children(), queryFn: () => orpc.profile.listChildren({}) });
  const [childId, setChildId] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<ComplaintVisibility>("teacher_and_director");
  const selectedChildId = childId || children.data?.[0]?.id || "";
  const create = useMutation({
    mutationFn: () => orpc.complaints.create({ childId: selectedChildId, category, subject, body, visibility }),
    onSuccess: (result) => { void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all() }); router.replace(`/dashboard/complaints/${result.id}`); },
  });
  const valid = selectedChildId && subject.trim() && body.trim();
  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="border-l-4 border-amber-500 pl-4"><p className="text-sm font-semibold text-muted-foreground">{t("subtitle")}</p><h2 className="text-2xl font-bold">{t("new")}</h2></div>
    <Card><CardHeader><CardTitle>{t("new")}</CardTitle></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>{t("child")}</Label><Select value={selectedChildId} onValueChange={setChildId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(children.data ?? []).map((child) => <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>{t("category")}</Label><Select value={category} onValueChange={(value) => setCategory(value as ComplaintCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{t(`categories.${item}`)}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="space-y-2"><Label htmlFor="complaint-subject">{t("subject")}</Label><Input id="complaint-subject" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} /><p className="text-right text-xs text-muted-foreground">{subject.length}/120</p></div>
      <div className="space-y-2"><Label htmlFor="complaint-body">{t("body")}</Label><Textarea id="complaint-body" rows={8} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} /><p className="text-right text-xs text-muted-foreground">{body.length}/4000</p></div>
      <fieldset className="space-y-3"><legend className="text-sm font-medium">{t("visibility")}</legend><div className="grid gap-3 sm:grid-cols-2">{(["teacher_and_director", "director_only"] as const).map((option) => { const confidential = option === "director_only"; const Icon = confidential ? LockKeyhole : Users; return <button key={option} type="button" onClick={() => setVisibility(option)} className={cn("rounded-2xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500", visibility === option ? confidential ? "border-amber-500 bg-amber-50" : "border-indigo-600 bg-indigo-50" : "border-border hover:border-slate-300")}><span className="flex items-center gap-2 font-bold"><Icon className={cn("h-5 w-5", confidential ? "text-amber-700" : "text-indigo-700")} />{t(confidential ? "directorOnly" : "teacherAndDirector")}</span><span className="mt-2 block text-sm leading-5 text-muted-foreground">{t(confidential ? "directorOnlyHelp" : "teacherAndDirectorHelp")}</span></button>; })}</div></fieldset>
      <div className="flex gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950"><Info className="h-5 w-5 shrink-0 text-indigo-700" /><p>{t("immutableWarning")}</p></div>
      {create.error ? <p className="text-sm text-destructive">{t("sendError")}</p> : null}
      <div className="flex justify-end"><Button disabled={!valid || create.isPending} onClick={() => create.mutate()} className="min-w-40 bg-indigo-700 hover:bg-indigo-800">{create.isPending ? t("sending") : t("send")}</Button></div>
    </CardContent></Card>
  </div>;
}
