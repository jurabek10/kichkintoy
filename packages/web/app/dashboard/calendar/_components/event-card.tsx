"use client";

import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { CalendarEventSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EventCard({ event }: { event: CalendarEventSummary }) {
  return (
    <Link href={`/dashboard/calendar/${event.id}`} className="block">
      <Card className="h-full transition hover:border-primary/50">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{event.title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {eventContext(event)}
              </p>
            </div>
            <Badge variant={event.status === "cancelled" ? "destructive" : "secondary"}>
              {event.status === "cancelled"
                ? "Cancelled"
                : event.seenByMe
                  ? "Seen"
                  : "Scheduled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {formatEventTime(event)}
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

export function formatEventTime(event: CalendarEventSummary) {
  const start = new Date(event.startsAt);
  if (event.allDay) return start.toLocaleDateString();
  const startText = start.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!event.endsAt) return startText;
  const end = new Date(event.endsAt);
  return `${startText} - ${end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function eventContext(event: CalendarEventSummary) {
  if (event.audienceType === "center") return "Whole center";
  if (event.audienceType === "class") {
    return event.classNames.length ? event.classNames.join(", ") : "Class event";
  }
  return event.childNames.length ? event.childNames.join(", ") : "Child event";
}
