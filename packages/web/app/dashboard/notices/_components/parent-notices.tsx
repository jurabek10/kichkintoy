"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { toApiError } from "@/lib/api/errors";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { NoticeCard } from "./notice-cards";

export function ParentNotices() {
  const { t } = useLayoutTranslation("notices");
  const {
    data: notices = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.notices.parentList(),
    queryFn: () => orpc.notices.parentList({}),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <Card className="p-6 text-sm text-muted-foreground">
          {t("loading")}
        </Card>
      ) : notices.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{t("empty.parentTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("empty.parentBody")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {notices.map((notice) => (
            <NoticeCard
              key={`${notice.id}:${notice.child?.id ?? "center"}`}
              notice={notice}
            />
          ))}
        </div>
      )}
    </div>
  );
}
