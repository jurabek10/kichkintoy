"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  Menu,
  PanelLeft,
  Pill,
  School,
  UserCheck,
  Utensils,
  X,
} from "lucide-react";
import type { TFunction } from "i18next";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { NotificationBell } from "./_components/notification-bell";
import { logoutAndClear, readSession, useSession } from "@/lib/session";
import { useRealtimeNotifications } from "@/lib/use-realtime-notifications";
import { cn } from "@/lib/utils";

const navByRole: Record<
  string,
  Array<{ href: string; labelKey: string; Icon: typeof LayoutDashboard }>
> = {
  director: [
    { href: "/dashboard", labelKey: "items.dashboard", Icon: LayoutDashboard },
    { href: "/dashboard/classes", labelKey: "items.classes", Icon: School },
    { href: "/dashboard/calendar", labelKey: "items.calendar", Icon: CalendarDays },
    { href: "/dashboard/documents", labelKey: "items.documents", Icon: FileCheck2 },
    { href: "/dashboard/attendance", labelKey: "items.attendance", Icon: ClipboardCheck },
    { href: "/dashboard/reports", labelKey: "items.reports", Icon: FileText },
    { href: "/dashboard/notices", labelKey: "items.notices", Icon: Bell },
    { href: "/dashboard/albums", labelKey: "items.albums", Icon: Images },
    { href: "/dashboard/meals", labelKey: "items.meals", Icon: Utensils },
    { href: "/dashboard/medications", labelKey: "items.medications", Icon: Pill },
    { href: "/dashboard/pickups", labelKey: "items.pickups", Icon: UserCheck },
    { href: "/dashboard/teachers", labelKey: "items.teachers", Icon: GraduationCap },
    { href: "/dashboard/requests", labelKey: "items.requests", Icon: Inbox },
    { href: "/dashboard/invitations", labelKey: "items.invitations", Icon: Mail },
  ],
  teacher: [
    { href: "/dashboard", labelKey: "items.dashboard", Icon: LayoutDashboard },
    { href: "/dashboard/classes", labelKey: "items.myClasses", Icon: School },
    { href: "/dashboard/calendar", labelKey: "items.calendar", Icon: CalendarDays },
    { href: "/dashboard/documents", labelKey: "items.documents", Icon: FileCheck2 },
    { href: "/dashboard/attendance", labelKey: "items.attendance", Icon: ClipboardCheck },
    { href: "/dashboard/reports", labelKey: "items.reports", Icon: FileText },
    { href: "/dashboard/notices", labelKey: "items.notices", Icon: Bell },
    { href: "/dashboard/albums", labelKey: "items.albums", Icon: Images },
    { href: "/dashboard/meals", labelKey: "items.meals", Icon: Utensils },
    { href: "/dashboard/medications", labelKey: "items.medications", Icon: Pill },
    { href: "/dashboard/pickups", labelKey: "items.pickups", Icon: UserCheck },
    { href: "/dashboard/requests", labelKey: "items.requests", Icon: Inbox },
  ],
  parent: [
    { href: "/dashboard", labelKey: "items.dashboard", Icon: LayoutDashboard },
    { href: "/dashboard/calendar", labelKey: "items.calendar", Icon: CalendarDays },
    { href: "/dashboard/documents", labelKey: "items.documents", Icon: FileCheck2 },
    { href: "/dashboard/attendance", labelKey: "items.attendance", Icon: ClipboardCheck },
    { href: "/dashboard/reports", labelKey: "items.reports", Icon: FileText },
    { href: "/dashboard/notices", labelKey: "items.notices", Icon: Bell },
    { href: "/dashboard/albums", labelKey: "items.albums", Icon: Images },
    { href: "/dashboard/meals", labelKey: "items.meals", Icon: Utensils },
    { href: "/dashboard/medications", labelKey: "items.medications", Icon: Pill },
    { href: "/dashboard/pickups", labelKey: "items.pickups", Icon: UserCheck },
  ],
};

const navGroups = [
  {
    labelKey: "groups.main",
    hrefs: ["/dashboard", "/dashboard/classes", "/dashboard/attendance"],
  },
  {
    labelKey: "groups.communication",
    hrefs: ["/dashboard/notices", "/dashboard/albums", "/dashboard/calendar"],
  },
  {
    labelKey: "groups.care",
    hrefs: [
      "/dashboard/reports",
      "/dashboard/meals",
      "/dashboard/medications",
      "/dashboard/pickups",
      "/dashboard/documents",
    ],
  },
  {
    labelKey: "groups.management",
    hrefs: ["/dashboard/teachers", "/dashboard/requests", "/dashboard/invitations"],
  },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { t: tCommon } = useLayoutTranslation("common");
  const { t: tNav } = useLayoutTranslation("nav");
  useRealtimeNotifications(session);
  const nav = navByRole[session?.user.role ?? ""] ?? [];
  const groupedNav = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: nav.filter((item) => group.hrefs.includes(item.href)),
        }))
        .filter((group) => group.items.length > 0),
    [nav],
  );
  const roleLabel =
    session?.user.role === "director"
      ? tCommon("roles.director")
      : session?.user.role === "teacher"
        ? tCommon("roles.teacher")
        : tCommon("roles.parent");

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

  async function handleSignOut() {
    const stored = readSession();
    await logoutAndClear(stored?.token ?? null);
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[#f7fbff]">
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={tCommon("actions.closeSidebar")}
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[18rem] max-w-[86vw] border-r bg-white shadow-pop">
            <SidebarContent
              groupedNav={groupedNav}
              pathname={pathname}
              roleLabel={roleLabel}
              centerName={session.membership.centerName}
              collapsed={false}
              onNavigate={() => setMobileSidebarOpen(false)}
              onSignOut={handleSignOut}
              tCommon={tCommon}
              tNav={tNav}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-[calc(100%+0.75rem)] top-4 rounded-full bg-white shadow-card"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label={tCommon("actions.closeSidebar")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "lg:grid lg:min-h-screen lg:transition-[grid-template-columns] lg:duration-200",
          sidebarOpen ? "lg:grid-cols-[272px_1fr]" : "lg:grid-cols-[72px_1fr]",
        )}
      >
        <aside
          className={cn(
            "group/sidebar relative hidden border-r bg-white lg:flex lg:flex-col",
            !sidebarOpen && "items-center",
          )}
          data-state={sidebarOpen ? "expanded" : "collapsed"}
        >
          <SidebarContent
            groupedNav={groupedNav}
            pathname={pathname}
            roleLabel={roleLabel}
            centerName={session.membership.centerName}
            collapsed={!sidebarOpen}
            onNavigate={() => undefined}
            onSignOut={handleSignOut}
            tCommon={tCommon}
            tNav={tNav}
          />
          <button
            type="button"
            aria-label={tCommon("actions.toggleSidebar")}
            title={tCommon("actions.toggleSidebar")}
            className="absolute inset-y-0 -right-3 hidden w-6 cursor-ew-resize items-center justify-center lg:flex"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span className="h-10 w-1 rounded-full bg-transparent transition hover:bg-border" />
          </button>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    window.matchMedia("(min-width: 1024px)").matches
                      ? setSidebarOpen((open) => !open)
                      : setMobileSidebarOpen(true)
                  }
                  aria-label={tCommon("actions.openSidebar")}
                >
                  <Menu className="h-4 w-4 lg:hidden" />
                  <PanelLeft className="hidden h-4 w-4 lg:block" />
                </Button>
                <div className="lg:hidden">
                  <BrandMark href="/dashboard" />
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-extrabold">
                    {tCommon("dashboard.hello", {
                      name: session.user.fullName,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel}
                    {session.membership.centerName
                      ? ` · ${session.membership.centerName}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden text-right sm:block lg:hidden">
                  <p className="text-sm font-bold">{session.user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
                <LanguageSwitcher />
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="hidden gap-2 sm:inline-flex"
                >
                  <LogOut className="h-4 w-4" />
                  {tCommon("actions.signOut")}
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto min-w-0 max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  groupedNav,
  pathname,
  roleLabel,
  centerName,
  collapsed,
  onNavigate,
  onSignOut,
  tCommon,
  tNav,
}: {
  groupedNav: Array<{
    labelKey: string;
    items: Array<{
      href: string;
      labelKey: string;
      Icon: typeof LayoutDashboard;
    }>;
  }>;
  pathname: string;
  roleLabel: string;
  centerName: string | null;
  collapsed: boolean;
  onNavigate: () => void;
  onSignOut: () => void;
  tCommon: TFunction<"common">;
  tNav: TFunction<"nav">;
}) {
  return (
    <>
      <div
        className={cn(
          "flex h-16 items-center border-b",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <BrandMark
          href="/dashboard"
          className={cn(collapsed && "[&>span:last-child]:hidden")}
        />
      </div>

      <div
        className={cn(
          "border-b",
          collapsed ? "px-2 py-3 text-center" : "px-4 py-4",
        )}
      >
        <div
          className={cn(
            "grid place-items-center rounded-xl bg-accent text-accent-foreground",
            collapsed ? "mx-auto h-10 w-10" : "h-11 w-11",
          )}
        >
          <School className="h-5 w-5" />
        </div>
        <div className={cn("mt-3 min-w-0", collapsed && "sr-only")}>
          <p className="text-xs font-extrabold uppercase text-primary">
            {tCommon("dashboard.panel", { role: roleLabel })}
          </p>
          <p className="mt-1 truncate text-sm font-bold">
            {centerName || tCommon("dashboard.defaultCenter")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tCommon("dashboard.subtitle")}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-3">
        {groupedNav.map((group) => (
          <div key={group.labelKey} className="flex flex-col gap-1">
            <p
              className={cn(
                "px-2 py-1 text-[11px] font-extrabold uppercase text-muted-foreground/75 transition",
                collapsed && "h-0 overflow-hidden py-0 opacity-0",
              )}
            >
              {tNav(group.labelKey)}
            </p>
            {group.items.map(({ href, labelKey, Icon }) => {
              const active =
                pathname === href ||
                (href !== "/dashboard" && pathname.startsWith(href));
              const label = tNav(labelKey);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-10 items-center rounded-xl text-sm font-bold transition",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    active
                      ? "bg-primary text-primary-foreground shadow-card"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn("truncate", collapsed && "sr-only")}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={onSignOut}
          title={collapsed ? tCommon("actions.signOut") : undefined}
          className={cn(
            "text-muted-foreground",
            collapsed ? "h-10 w-10" : "w-full justify-start gap-2",
          )}
        >
          <LogOut className="h-4 w-4" />
          <span className={cn(collapsed && "sr-only")}>
            {tCommon("actions.signOut")}
          </span>
        </Button>
      </div>
    </>
  );
}
