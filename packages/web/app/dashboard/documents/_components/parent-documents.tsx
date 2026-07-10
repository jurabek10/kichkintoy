"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSelectedChild } from "@/lib/selected-child";
import { submissionStatusKey, templateTypeKey } from "./document-utils";

export function ParentDocuments() {
  const { t } = useLayoutTranslation("documents");
  // Scoped to the globally selected kid (header switcher).
  const { childId } = useSelectedChild();
  const { data = [], isPending } = useQuery({
    queryKey: queryKeys.studentDocuments.parentRequests({ childId }),
    queryFn: () => orpc.studentDocuments.parentRequests({ childId }),
    enabled: !!childId,
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileCheck2 className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
      </Card>

      {isPending ? (
        <LoadingCard label={t("loading")} />
      ) : data.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <FileCheck2 className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{t("empty.parentTitle")}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {data.map((submission) => (
            <Link key={submission.id} href={`/dashboard/documents/${submission.id}`}>
              <Card className="transition hover:bg-muted/50">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{submission.requestTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {submission.childName} ·{" "}
                      {t(templateTypeKey(submission.templateType))}
                    </p>
                    {submission.correctionNote ? (
                      <p className="mt-1 text-sm text-warning">
                        {submission.correctionNote}
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant={
                      submission.status === "accepted"
                        ? "success"
                        : submission.status === "needs_correction"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {t(submissionStatusKey(submission.status))}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
