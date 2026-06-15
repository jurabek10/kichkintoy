"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { TFunction } from "i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { formatDate, genderLabel } from "@/lib/format";

export function TeacherClassDetail({ classId }: { classId: string }) {
  const { t } = useLayoutTranslation("classes");

  const {
    data: children = [],
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.teacher.classChildren(classId),
    queryFn: () => orpc.teacher.classChildren({ classId }),
  });

  const error = queryError ? toApiError(queryError).message : null;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/classes"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("myTitle")}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("childrenTitle", { count: children.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : loading ? (
            <KidsLoader label={t("loading")} size="sm" />
          ) : children.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noChildrenInClass")}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {children.map((child) => (
                <li
                  key={child.childId}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {child.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={child.photoUrl}
                        alt={child.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      child.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{child.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {translatedGender(child.gender, t)} ·{" "}
                      {formatDate(child.dateOfBirth)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function translatedGender(
  value: string | null | undefined,
  t: TFunction<"classes">,
) {
  if (value === "boy") return t("gender.boy");
  if (value === "girl") return t("gender.girl");
  if (value === "prefer_not_to_say") return t("gender.prefer_not_to_say");
  return genderLabel(value);
}
