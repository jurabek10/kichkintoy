"use client";

import { EventComposer } from "../_components/event-composer";
import { useSession } from "@/lib/session";

export default function NewCalendarEventPage() {
  const { session } = useSession();
  if (!session || session.user.role === "parent") return null;

  return (
    <EventComposer
      centerId={session.membership.centerId}
      role={session.user.role}
    />
  );
}
