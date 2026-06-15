"use client";

import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { CalendarEventSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { formatDayMonth, formatDayMonthTime, formatTime } from "@/lib/date";

export function EventCard({ event }: { event: CalendarEventSummary }) {
  const { t, i18n } = useLayoutTranslation("calendar");
  return (
    <Link href={`/dashboard/calendar/${event.id}`} className="block">
      <Card className="h-full transition hover:border-primary/50">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{event.title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {eventContext(event, t)}
              </p>
            </div>
            <Badge variant={event.status === "cancelled" ? "destructive" : "secondary"}>
              {t(eventStatusKey(event))}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {formatEventTime(event, i18n.language)}
          </p>
          {event.locationText ? (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {event.locationText}
            </p>
          ) : null}
          {event.cancellationReason ? <p>{event.cancellationReason}</p> : null}
        </CardContent>
      </Card>
    </Link>
  );
}

export function formatEventTime(
  event: CalendarEventSummary,
  language: string,
) {
  if (event.allDay) return formatDayMonth(event.startsAt, language);
  const startText = formatDayMonthTime(event.startsAt, language);
  if (!event.endsAt) return startText;
  return `${startText} - ${formatTime(event.endsAt)}`;
}

export function eventContext(
  event: CalendarEventSummary,
  t: (key: string) => string,
) {
  if (event.audienceType === "center") return t("audience.wholeCenter");
  if (event.audienceType === "class") {
    return event.classNames.length
      ? event.classNames.join(", ")
      : t("audience.classEvent");
  }
  return event.childNames.length
    ? event.childNames.join(", ")
    : t("audience.childEvent");
}

function eventStatusKey(event: CalendarEventSummary) {
  if (event.status === "cancelled") return "status.cancelled";
  return event.seenByMe ? "status.seen" : "status.scheduled";
}
