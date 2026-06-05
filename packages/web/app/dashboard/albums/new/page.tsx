"use client";

import { AlbumComposer } from "../_components/album-composer";
import { useSession } from "@/lib/session";

export default function NewAlbumPage() {
  const { session } = useSession();
  if (!session || session.user.role === "parent") return null;

  return <AlbumComposer centerId={session.membership.centerId} />;
}
