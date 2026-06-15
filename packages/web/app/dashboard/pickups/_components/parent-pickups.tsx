"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { DatePicker } from "@/components/ui/date-picker";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { PickupCard } from "./pickup-card";

export function ParentPickups() {
  const { t } = useLayoutTranslation("pickups");
  const [date, setDate] = useState(todayIso());
  const input = { date };
  const {
    data: notices = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.pickups.parentList(input),
    queryFn: () => orpc.pickups.parentList(input),
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("parentDescription")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DatePicker
              value={date}
              onValueChange={setDate}
              className="w-[155px]"
            />
            <Button asChild>
              <Link href="/dashboard/pickups/new">
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
        <LoadingCard label={t("loading")} />
      ) : notices.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <UserCheck className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">{t("empty.parentTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("empty.parentBody")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {notices.map((notice) => (
            <PickupCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
