"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FileCheck2,
  GraduationCap,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Pill,
  School,
  Sparkles,
  UserCheck,
  Utensils,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NotificationBell } from "./_components/notification-bell";
import { logoutAndClear, readSession, useSession } from "@/lib/session";
import { useRealtimeNotifications } from "@/lib/use-realtime-notifications";
import { cn } from "@/lib/utils";

const navByRole: Record<
  string,
  Array<{ href: string; label: string; Icon: typeof LayoutDashboard }>
> = {
  director: [
    { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
    { href: "/dashboard/classes", label: "Classes", Icon: School },
    { href: "/dashboard/calendar", label: "Calendar", Icon: CalendarDays },
    { href: "/dashboard/special-classes", label: "Special classes", Icon: Sparkles },
    { href: "/dashboard/documents", label: "Documents", Icon: FileCheck2 },
    { href: "/dashboard/attendance", label: "Attendance", Icon: ClipboardCheck },
    { href: "/dashboard/reports", label: "Reports", Icon: FileText },
    { href: "/dashboard/notices", label: "Notices", Icon: Bell },
    { href: "/dashboard/albums", label: "Albums", Icon: Images },
    { href: "/dashboard/meals", label: "Meals", Icon: Utensils },
    { href: "/dashboard/medications", label: "Medication", Icon: Pill },
    { href: "/dashboard/pickups", label: "Pickup", Icon: UserCheck },
    { href: "/dashboard/teachers", label: "Teachers", Icon: GraduationCap },
    { href: "/dashboard/requests", label: "Join requests", Icon: Inbox },
    { href: "/dashboard/invitations", label: "Invitations", Icon: Mail },
  ],
  teacher: [
    { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
    { href: "/dashboard/classes", label: "My classes", Icon: School },
    { href: "/dashboard/calendar", label: "Calendar", Icon: CalendarDays },
    { href: "/dashboard/special-classes", label: "Special classes", Icon: Sparkles },
    { href: "/dashboard/documents", label: "Documents", Icon: FileCheck2 },
    { href: "/dashboard/attendance", label: "Attendance", Icon: ClipboardCheck },
    { href: "/dashboard/reports", label: "Reports", Icon: FileText },
    { href: "/dashboard/notices", label: "Notices", Icon: Bell },
    { href: "/dashboard/albums", label: "Albums", Icon: Images },
    { href: "/dashboard/meals", label: "Meals", Icon: Utensils },
    { href: "/dashboard/medications", label: "Medication", Icon: Pill },
    { href: "/dashboard/pickups", label: "Pickup", Icon: UserCheck },
    { href: "/dashboard/requests", label: "Join requests", Icon: Inbox },
  ],
  parent: [
    { href: "/dashboard", label: "Overview", Icon: LayoutDashboard },
    { href: "/dashboard/calendar", label: "Calendar", Icon: CalendarDays },
    { href: "/dashboard/special-classes", label: "Special classes", Icon: Sparkles },
    { href: "/dashboard/documents", label: "Documents", Icon: FileCheck2 },
    { href: "/dashboard/attendance", label: "Attendance", Icon: ClipboardCheck },
    { href: "/dashboard/reports", label: "Reports", Icon: FileText },
    { href: "/dashboard/notices", label: "Notices", Icon: Bell },
    { href: "/dashboard/albums", label: "Albums", Icon: Images },
    { href: "/dashboard/meals", label: "Meals", Icon: Utensils },
    { href: "/dashboard/medications", label: "Medication", Icon: Pill },
    { href: "/dashboard/pickups", label: "Pickup", Icon: UserCheck },
  ],
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useRealtimeNotifications(session);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.membership.status === "pending") {
      router.replace("/pending");
    }
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/40 px-6">
        <Card className="w-full max-w-sm p-8 text-center text-sm text-muted-foreground">
          Loading…
        </Card>
      </main>
    );
  }

  const nav = navByRole[session.user.role] ?? [];

  async function handleSignOut() {
    const stored = readSession();
    await logoutAndClear(stored?.token ?? null);
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-shell items-center justify-between px-6 py-4">
          <BrandMark href="/dashboard" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{session.user.fullName}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {session.user.role}
                {session.membership.centerName
                  ? ` · ${session.membership.centerName}`
                  : ""}
              </p>
            </div>
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-shell gap-6 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          <nav className="flex flex-col gap-1">
            {nav.map(({ href, label, Icon }) => {
              const active =
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </Card>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
