"use client";

import { useParams } from "next/navigation";
import { AlbumDetailScreen } from "../_components/album-detail-screen";

export default function AlbumDetailPage() {
  const params = useParams<{ postId: string }>();
  return <AlbumDetailScreen postId={params.postId} />;
}
