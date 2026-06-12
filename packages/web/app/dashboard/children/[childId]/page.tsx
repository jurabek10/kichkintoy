"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";

export default function ChildProfilePage() {
  const { t } = useLayoutTranslation("classes");
  const params = useParams<{ childId: string }>();
  const childId = params.childId;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/classes"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("childProfile.back")}
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{t("childProfile.title")}</CardTitle>
            <Badge variant="outline">{t("childrenTable.paymentComingSoon")}</Badge>
          </div>
          <CardDescription>{t("childProfile.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert variant="warning">
            <Pencil className="h-4 w-4" />
            <AlertDescription>{t("childProfile.comingSoon")}</AlertDescription>
          </Alert>
          <div className="rounded-xl border bg-muted/30 p-4 text-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">
              {t("childProfile.childId")}
            </p>
            <p className="mt-1 break-all font-mono">{childId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
