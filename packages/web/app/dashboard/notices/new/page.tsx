"use client";

import { NoticeComposer } from "../_components/notice-composer";
import { useSession } from "@/lib/session";

export default function NewNoticePage() {
  const { session } = useSession();
  if (!session || session.user.role === "parent") return null;

  return (
    <NoticeComposer
      centerId={session.membership.centerId}
      director={session.user.role === "director"}
    />
  );
}
