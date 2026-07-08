"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ParentPayments } from "./_components/parent-payments";
import { useSession } from "@/lib/session";

export default function PaymentsPage() {
  const { session } = useSession();
  const router = useRouter();

  // Tuition payment is a parent-only surface; staff who land here (e.g. via a
  // typed URL) go back to their home dashboard.
  const isParent = session?.user.role === "parent";
  useEffect(() => {
    if (session && !isParent) router.replace("/dashboard");
  }, [session, isParent, router]);

  if (!session || !isParent) return null;

  return <ParentPayments />;
}
