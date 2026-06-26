"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { formatTime, formatWeekdayLong } from "@/lib/date";
import { cn } from "@/lib/utils";
import { EventComposer } from "./event-composer";
import { eventContext } from "./event-card";

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

  const cancelled = event.status === "cancelled";
  const completed = event.status === "completed";
  const audienceValue =
    event.audienceType === "center"
      ? t("audience.wholeCenter")
      : eventContext(event, t);
  const seen = event.seenByMe || markSeen.isPending;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/calendar">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      {/* Title + status */}
      <div className="flex flex-col gap-2">
        {cancelled ? (
          <span className="inline-flex w-fit items-center rounded-full bg-coral px-3 py-1 text-xs font-bold text-coral-ink">
            {t("status.cancelled")}
          </span>
        ) : completed ? (
          <span className="inline-flex w-fit items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {t("detail.completed")}
          </span>
        ) : null}
        <h1
          className={cn(
            "text-2xl font-extrabold leading-tight tracking-tight",
            cancelled ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {event.title}
        </h1>
      </div>

      {/* Facts */}
      <Card className="overflow-hidden p-0">
        <InfoRow
          Icon={CalendarDays}
          label={t("detail.when")}
          value={formatWeekdayLong(event.startsAt, i18n.language)}
        />
        <InfoRow
          Icon={Clock}
          label={t("detail.time")}
          value={
            event.allDay
              ? t("allDay")
              : event.endsAt
                ? `${formatTime(event.startsAt)} – ${formatTime(event.endsAt)}`
                : formatTime(event.startsAt)
          }
        />
        {event.locationText ? (
          <InfoRow
            Icon={MapPin}
            label={t("detail.location")}
            value={event.locationText}
          />
        ) : null}
        {audienceValue ? (
          <InfoRow
            Icon={Users}
            label={t("detail.audience")}
            value={audienceValue}
          />
        ) : null}
        <InfoRow
          Icon={User}
          label={t("detail.organizer")}
          value={event.authorName}
          last
        />
      </Card>

      {/* Description */}
      {event.description ? (
        <Card className="p-4">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("detail.details")}
          </p>
          <p className="whitespace-pre-wrap text-[15px] leading-6 text-foreground">
            {event.description}
          </p>
        </Card>
      ) : null}

      {/* Cancellation reason */}
      {cancelled ? (
        <Card className="border-coral-ink/20 bg-coral/20 p-4">
          <p className="mb-1 text-xs font-bold text-coral-ink">
            {t("detail.cancelledTitle")}
          </p>
          <p className="text-sm leading-5 text-foreground">
            {event.cancellationReason || t("detail.cancelled")}
          </p>
        </Card>
      ) : null}

      {/* Acknowledge — the one thing a parent does with an event */}
      {!cancelled ? (
        <Button
          type="button"
          size="lg"
          variant={seen ? "secondary" : "default"}
          className="w-full gap-1.5"
          disabled={seen}
          onClick={() => markSeen.mutate()}
        >
          {seen ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {seen ? t("detail.seen") : t("detail.gotIt")}
        </Button>
      ) : null}
    </div>
  );
}

/** One labelled fact in the event's info card, with a sky-tinted icon. */
function InfoRow({
  Icon,
  label,
  value,
  last,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        !last && "border-b",
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky/40 text-sky-ink">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
