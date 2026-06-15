"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingCard } from "@/components/loading-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { EventComposer } from "./event-composer";
import { eventContext, formatEventTime } from "./event-card";

export function EventDetailScreen({
  eventId,
  centerId,
  role,
}: {
  eventId: string;
  centerId: string | null;
  role: string;
}) {
  const { t, i18n } = useLayoutTranslation("calendar");
  const queryClient = useQueryClient();
  const [cancellationReason, setCancellationReason] = useState("");
  const isParent = role === "parent";
  const {
    data: event,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.calendar.detail(eventId),
    queryFn: () => orpc.calendar.detail({ eventId }),
  });

  const markSeen = useMutation({
    mutationFn: () => orpc.calendar.markSeen({ eventId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.all(),
      });
    },
  });

  const cancel = useMutation({
    mutationFn: () =>
      orpc.calendar.cancel({
        eventId,
        cancellationReason: cancellationReason || undefined,
      }),
    onSuccess: async () => {
      toast.success(t("toast.cancelled"));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.all(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    },
  });

  const eventSeen = event?.seenByMe ?? true;
  const currentEventId = event?.id;

  useEffect(() => {
    if (isParent && currentEventId && !eventSeen && !markSeen.isPending) {
      markSeen.mutate();
    }
  }, [currentEventId, eventSeen, isParent, markSeen.isPending]);

  if (isPending) {
    return (
      <LoadingCard label={t("loading")} />
    );
  }

  if (error || !event) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : t("detail.notFound")}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isParent) {
    return (
      <div className="flex flex-col gap-4">
        <EventComposer centerId={centerId} role={role} event={event} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("detail.cancelTitle")}
            </CardTitle>
            <CardDescription>{t("detail.cancelDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {cancel.error ? (
              <Alert variant="destructive">
                <AlertDescription>{toApiError(cancel.error).message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="cancel-reason">{t("detail.reason")}</Label>
              <Input
                id="cancel-reason"
                value={cancellationReason}
                onChange={(event) => setCancellationReason(event.target.value)}
                maxLength={500}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="destructive"
                disabled={cancel.isPending || event.status === "cancelled"}
                onClick={() => cancel.mutate()}
              >
                <X className="h-4 w-4" />
                {t("detail.cancelButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/calendar">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{event.title}</CardTitle>
          <CardDescription>{eventContext(event, t)}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <p className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {formatEventTime(event, i18n.language)}
          </p>
          {event.locationText ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {event.locationText}
            </p>
          ) : null}
          {event.status === "cancelled" ? (
            <Alert variant="warning">
              <AlertDescription>
                {t("detail.cancelled")}
                {event.cancellationReason ? ` ${event.cancellationReason}` : ""}
              </AlertDescription>
            </Alert>
          ) : null}
          {event.description ? (
            <p className="whitespace-pre-wrap">{event.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {event.seenByMe ? t("status.seen") : t("detail.markingSeen")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
