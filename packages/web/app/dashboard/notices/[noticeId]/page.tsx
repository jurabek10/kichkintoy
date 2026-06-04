"use client";

import { useParams } from "next/navigation";
import { NoticeDetailScreen } from "../_components/notice-detail-screen";
import { useSession } from "@/lib/session";

export default function NoticeDetailPage() {
  const params = useParams<{ noticeId: string }>();
  const { session } = useSession();
  if (!session) return null;

  return (
    <NoticeDetailScreen
      noticeId={params.noticeId}
      parent={session.user.role === "parent"}
    />
  );
}
