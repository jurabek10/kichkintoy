"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

export function TeacherDocuments({ centerId }: { centerId: string | null }) {
  const { t } = useLayoutTranslation("documents");
  const [childId, setChildId] = useState("");
  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(centerId),
    queryFn: () => orpc.attendance.children({ centerId: centerId ?? "" }),
    enabled: !!centerId,
  });
  const safetyQuery = useQuery({
    queryKey: queryKeys.studentDocuments.safetySummary(childId),
    queryFn: () => orpc.studentDocuments.childSafetySummary({ childId }),
    enabled: !!childId,
  });

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const children = childrenQuery.data?.children ?? [];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5" />
            {t("teacherTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={childId} onValueChange={setChildId}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder={t("chooseChild")} />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name} {child.className ? `· ${child.className}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {safetyQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(safetyQuery.error).message}</AlertDescription>
        </Alert>
      ) : null}

      {safetyQuery.data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {safetyQuery.data.childName}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Info label={t("safety.class")} value={safetyQuery.data.className ?? t("safety.noClass")} />
            <Info label={t("safety.allergies")} value={safetyQuery.data.allergies ?? t("safety.none")} />
            <Info
              label={t("safety.medicalNotes")}
              value={safetyQuery.data.medicalNotes ?? t("safety.none")}
            />
            <Info
              label={t("safety.emergencyContacts")}
              value={
                safetyQuery.data.emergencyContacts.length
                  ? safetyQuery.data.emergencyContacts.join(", ")
                  : t("safety.none")
              }
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
