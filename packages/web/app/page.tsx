"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readSession, routeForMembership } from "@/lib/session";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    router.replace(routeForMembership(session.user.role, session.membership));
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40">
      <p className="text-sm font-semibold text-muted-foreground">Loading…</p>
    </main>
  );
}
