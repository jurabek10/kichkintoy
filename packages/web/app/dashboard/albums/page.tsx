"use client";

import { ParentAlbums } from "./_components/parent-albums";
import { StaffAlbums } from "./_components/staff-albums";
import { useSession } from "@/lib/session";

export default function AlbumsPage() {
  const { session } = useSession();
  if (!session) return null;

  if (session.user.role === "parent") return <ParentAlbums />;

  return <StaffAlbums centerId={session.membership.centerId} />;
}
