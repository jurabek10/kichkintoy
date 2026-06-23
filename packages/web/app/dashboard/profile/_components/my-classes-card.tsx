"use client";

import { useQuery } from "@tanstack/react-query";
import { School, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { assignmentRoleLabel } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

export function MyClassesCard() {
  const { t } = useLayoutTranslation("profile");
  const { t: tClasses } = useLayoutTranslation("classes");

  const {
    data: classes = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.teacher.classes(),
    queryFn: () => orpc.teacher.classes({}),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("classes.title")}</CardTitle>
        <CardDescription>{t("classes.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <KidsLoader label={tClasses("loading")} size="sm" />
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{toApiError(error).message}</AlertDescription>
          </Alert>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground">
              <School className="h-5 w-5" />
            </span>
            <p className="text-sm text-muted-foreground">{t("classes.empty")}</p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {classes.map((klass) => (
              <li
                key={klass.id}
                className="flex items-center gap-3 rounded-xl border p-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <School className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{klass.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[klass.ageGroup, klass.academicYear]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {tClasses("childCount", { count: klass.childCount })}
                  </span>
                </div>
                <Badge variant="info" className="shrink-0">
                  {tClasses(
                    `roles.${klass.assignmentRole}`,
                    assignmentRoleLabel(klass.assignmentRole),
                  )}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
