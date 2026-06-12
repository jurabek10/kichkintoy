"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
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
  UserCheck,
  Utensils,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { CandyTrim, KidCloud, KidBalloon } from "@/components/kids-decor";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { NotificationBell } from "./_components/notification-bell";
import { logoutAndClear, readSession, useSession } from "@/lib/session";
import { useRealtimeNotifications } from "@/lib/use-realtime-notifications";
import { cn } from "@/lib/utils";

const KidsToys3D = dynamic(
  () => import("@/components/kids-3d").then((m) => m.KidsToys3D),
  { ssr: false },
);

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

const navColors: Record<string, string> = {
  "/dashboard": "text-coral",
  "/dashboard/classes": "text-sky",
  "/dashboard/attendance": "text-mint",
  "/dashboard/notices": "text-coral",
  "/dashboard/albums": "text-grape",
  "/dashboard/calendar": "text-sky",
  "/dashboard/reports": "text-mint",
  "/dashboard/meals": "text-sunshine",
  "/dashboard/medications": "text-bubblegum",
  "/dashboard/pickups": "text-grape",
  "/dashboard/documents": "text-sky",
  "/dashboard/teachers": "text-coral",
  "/dashboard/requests": "text-mint",
  "/dashboard/invitations": "text-grape",
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
      <main className="grid min-h-screen place-items-center bg-kids-dots px-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-52 w-52">
            <KidsToys3D />
          </div>
          <div className="flex gap-2">
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-coral [animation-delay:0ms]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-sky [animation-delay:150ms]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-mint [animation-delay:300ms]" />
          </div>
        </div>
      </main>
    );
  }

  async function handleSignOut() {
    const stored = readSession();
    await logoutAndClear(stored?.token ?? null);
    router.replace("/login");
  }

  const isParent = session.user.role === "parent";

  return (
    <SidebarProvider className={isParent ? "font-kids" : undefined}>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="gap-3 p-3">
          <div className="flex h-12 items-center px-1">
            <BrandMark
              href="/dashboard"
              className="text-sidebar-foreground group-data-[collapsible=icon]:[&>span:last-child]:hidden"
            />
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-sidebar-border bg-white p-3 shadow-sm group-data-[collapsible=icon]:hidden">
            <KidCloud className="pointer-events-none absolute -right-2 -top-1 h-7 w-14 text-sky/25" />
            <div className="relative flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary via-sky to-grape text-white">
                <School className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                  {tCommon("dashboard.panel", { role: roleLabel })}
                </p>
                <p className="truncate text-sm font-bold text-sidebar-foreground">
                  {session.membership.centerName ||
                    tCommon("dashboard.defaultCenter")}
                </p>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-1">
          {groupedNav.map((group) => (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel>{tNav(group.labelKey)}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map(({ href, labelKey, Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href));
                  const label = tNav(labelKey);
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <Link href={href}>
                          <Icon className={navColors[href] ?? "text-primary"} />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-2">
          <div className="relative mb-1 flex items-center justify-center gap-1 overflow-hidden rounded-2xl bg-gradient-to-r from-sky/15 via-mint/15 to-coral/15 py-2 group-data-[collapsible=icon]:hidden">
            <KidBalloon className="h-9 w-6 animate-float text-coral" />
            <KidBalloon className="h-7 w-5 animate-float-slow text-sky" />
            <KidBalloon className="h-8 w-5 animate-float text-grape" />
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={tCommon("actions.signOut")}
                onClick={handleSignOut}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut />
                <span>{tCommon("actions.signOut")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-kids-dots">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="text-foreground" />
              <div className="lg:hidden">
                <BrandMark href="/dashboard" />
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-extrabold">
                  {tCommon("dashboard.hello", { name: session.user.fullName })}
                </p>
                <p className="truncate text-xs text-muted-foreground">
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
          <CandyTrim />
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1240px] animate-fade-in-up px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
