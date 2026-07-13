import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ComplaintStatus } from "@kichkintoy/shared";
import type { TFunction } from "i18next";

export function ComplaintStatusBadge({ status, t }: { status: ComplaintStatus; t: TFunction<"complaints"> }) {
  return <Badge className={cn("border", status === "open" && "border-amber-300 bg-amber-100 text-amber-900", status === "in_progress" && "border-indigo-300 bg-indigo-100 text-indigo-900", status === "resolved" && "border-emerald-300 bg-emerald-100 text-emerald-900", status === "withdrawn" && "border-slate-300 bg-slate-100 text-slate-600")}>{t(`statuses.${status}`)}</Badge>;
}

export function formatComplaintDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
