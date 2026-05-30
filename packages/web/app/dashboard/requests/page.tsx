"use client";

import { RequestsScreen } from "./_components/requests-screen";
import { useSession } from "@/lib/session";

export default function RequestsPage() {
  const { session } = useSession();
  if (!session) return null;

  return <RequestsScreen centerId={session.membership.centerId} />;
}
