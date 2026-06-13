"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { NoticeCard } from "./notice-cards";

type NoticeStatusFilter = "all" | "draft" | "scheduled" | "published";

export function StaffNotices({
  centerId,
}: {
  centerId: string | null;
  director: boolean;
}) {
  const { t } = useLayoutTranslation("notices");
  const [status, setStatus] = useState<NoticeStatusFilter>("all");
  const {
    data: notices = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.notices.authorList(centerId ?? "", status),
    queryFn: () =>
      orpc.notices.authorList({
        centerId: centerId!,
        status: status === "all" ? undefined : status,
      }),
    enabled: !!centerId,
  });

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("staffDescription")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as NoticeStatusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all")}</SelectItem>
                <SelectItem value="published">
                  {t("status.published")}
                </SelectItem>
                <SelectItem value="draft">{t("filters.drafts")}</SelectItem>
                <SelectItem value="scheduled">
                  {t("status.scheduled")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/dashboard/notices/new">
                <Plus className="h-4 w-4" />
                {t("newNotice")}
              </Link>
            </Button>
          </div>
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
          <p className="font-semibold">{t("empty.staffTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("empty.staffBody")}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}
    </div>
  );
}
