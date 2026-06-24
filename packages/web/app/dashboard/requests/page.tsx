"use client";

import { RequestsScreen } from "./_components/requests-screen";
import { useSession } from "@/lib/session";

export default function RequestsPage() {
  const { session } = useSession();
  if (!session) return null;

  // Directors can always act; the membership flag only gates teachers (and is
  // absent on sessions issued before the flag existed, so don't rely on it for
  // directors).
  const canApprove =
    session.user.role === "director" ||
    (session.membership.canApproveMembers ?? false);

  return (
    <RequestsScreen
      centerId={session.membership.centerId}
      canApprove={canApprove}
    />
  );
}
