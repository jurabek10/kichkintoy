"use client";

import { useParams } from "next/navigation";
import { EventDetailScreen } from "../_components/event-detail-screen";
import { useSession } from "@/lib/session";

export default function CalendarEventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const { session } = useSession();
  if (!session) return null;

  return (
    <EventDetailScreen
      eventId={params.eventId}
      centerId={session.membership.centerId}
      role={session.user.role}
    />
  );
}
