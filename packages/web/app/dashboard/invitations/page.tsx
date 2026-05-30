"use client";

import { InvitationsScreen } from "./_components/invitations-screen";
import { useSession } from "@/lib/session";

export default function InvitationsPage() {
  const { session } = useSession();
  if (!session) return null;

  return <InvitationsScreen centerId={session.membership.centerId} />;
}
