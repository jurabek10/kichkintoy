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
  Sparkles,
  UserCheck,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
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
  useSidebar,
} from "@/components/ui/sidebar";
import type { TFunction } from "i18next";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { ChildSwitcher } from "./_components/child-switcher";
import { ChildAvatar } from "./profile/_components/child-avatar";
import { NotificationBell } from "./_components/notification-bell";
import { ParentBottomNav } from "./_components/parent-bottom-nav";
import { useSelectedChild } from "@/lib/selected-child";
import { logoutAndClear, readSession, useSession } from "@/lib/session";
import { useRealtimeNotifications } from "@/lib/use-realtime-notifications";
import { cn } from "@/lib/utils";

function BouncingDots() {
  return (
    <div className="flex h-full items-center justify-center gap-2">
      <span className="h-3 w-3 animate-bounce rounded-full bg-coral [animation-delay:0ms]" />
      <span className="h-3 w-3 animate-bounce rounded-full bg-sky [animation-delay:150ms]" />
      <span className="h-3 w-3 animate-bounce rounded-full bg-mint [animation-delay:300ms]" />
    </div>
  );
}

const KidsToys3D = dynamic(
  () => import("@/components/kids-3d").then((m) => m.KidsToys3D),
  { ssr: false, loading: () => <BouncingDots /> },
);

const navByRole: Record<
  string,
  Array<{ href: string; labelKey: string; Icon: typeof LayoutDashboard }>
> = {
  director: [
    { href: "/dashboard", labelKey: "items.dashboard", Icon: LayoutDashboard },
    { href: "/dashboard/chat", labelKey: "items.chat", Icon: Sparkles },
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
    { href: "/dashboard/chat", labelKey: "items.chat", Icon: Sparkles },
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
    { href: "/dashboard/chat", labelKey: "items.chat", Icon: Sparkles },
    { href: "/dashboard/calendar", labelKey: "items.calendar", Icon: CalendarDays },
    { href: "/dashboard/documents", labelKey: "items.documents", Icon: FileCheck2 },
    { href: "/dashboard/attendance", labelKey: "items.attendance", Icon: ClipboardCheck },
    { href: "/dashboard/reports", labelKey: "items.reports", Icon: FileText },
    { href: "/dashboard/notices", labelKey: "items.notices", Icon: Bell },
    { href: "/dashboard/albums", labelKey: "items.albums", Icon: Images },
    { href: "/dashboard/meals", labelKey: "items.meals", Icon: Utensils },
    { href: "/dashboard/medications", labelKey: "items.medications", Icon: Pill },
    { href: "/dashboard/pickups", labelKey: "items.pickups", Icon: UserCheck },
    { href: "/dashboard/payments", labelKey: "items.payments", Icon: Wallet },
  ],
};

const navColors: Record<string, string> = {
  "/dashboard": "text-coral-ink",
  "/dashboard/chat": "text-grape-ink",
  "/dashboard/classes": "text-sky-ink",
  "/dashboard/attendance": "text-mint-ink",
  "/dashboard/notices": "text-coral-ink",
  "/dashboard/albums": "text-grape-ink",
  "/dashboard/calendar": "text-sky-ink",
  "/dashboard/reports": "text-mint-ink",
  "/dashboard/meals": "text-sunshine-ink",
  "/dashboard/medications": "text-bubblegum-ink",
  "/dashboard/pickups": "text-grape-ink",
  "/dashboard/payments": "text-mint-ink",
  "/dashboard/documents": "text-sky-ink",
  "/dashboard/teachers": "text-coral-ink",
  "/dashboard/requests": "text-mint-ink",
  "/dashboard/invitations": "text-grape-ink",
};

const navGroups = [
  {
    labelKey: "groups.main",
    hrefs: [
      "/dashboard",
      "/dashboard/chat",
      "/dashboard/classes",
      "/dashboard/attendance",
    ],
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
      "/dashboard/payments",
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
  // For parents the shell follows the selected kid — a sibling may attend a
  // different kindergarten, so the sidebar center name tracks the switcher.
  const { child: selectedChild } = useSelectedChild();
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

  // The current page's name, used as the page-level <h1> landmark so every
  // route has a single proper heading for assistive tech and the document
  // outline (the visible card titles stay as styled text).
  const activeNavItem = nav.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );
  const pageTitle = activeNavItem
    ? tNav(activeNavItem.labelKey)
    : tCommon("dashboard.panel", { role: roleLabel });

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    // The platform admin lives in /admin, not the center dashboard.
    if (session.user.role === "super_admin") {
      router.replace("/admin");
      return;
    }
    if (session.membership.status === "pending") {
      router.replace("/pending");
    }
  }, [loading, session, router]);

  // Each role wears its own scoped token set, applied at the document root so
  // Radix portals (the mobile rail, dialogs, popovers) inherit it too:
  //   • director — a serious steel "operations console"
  //   • teacher  — the mobile app's cool-gray + blue world, brought to desktop
  //   • parent   — the same mobile world (cool-gray + blue), so the parent's
  //                phone and web read as one product
  const role = session?.user.role;
  useEffect(() => {
    const root = document.documentElement;
    if (role === "director") {
      root.dataset.theme = "director";
    } else if (role === "teacher") {
      root.dataset.theme = "teacher";
    } else if (role === "parent") {
      root.dataset.theme = "parent";
    } else {
      delete root.dataset.theme;
    }
    return () => {
      delete root.dataset.theme;
    };
  }, [role]);

  if (loading || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-kids-dots px-6">
        <div className="h-64 w-64">
          <KidsToys3D />
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
  const isDirector = session.user.role === "director";
  const isTeacher = session.user.role === "teacher";
  // All roles now have a "My Page" account screen.
  const showMyPage = true;

  return (
    <SidebarProvider>{/* Parent shares the teacher/phone typography (Inter), not a separate kids font. */}
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="relative gap-3 p-3">
          <div className="flex h-12 items-center px-1">
            <BrandMark
              href="/dashboard"
              className="text-sidebar-foreground group-data-[collapsible=icon]:[&>span:last-child]:hidden"
            />
            <SidebarMobileClose />
          </div>
          {isDirector ? (
            <div className="rounded-md border border-sidebar-border bg-sidebar-accent/60 p-3 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <School className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">
                    {tCommon("dashboard.panel", { role: roleLabel })}
                  </p>
                  <p className="truncate text-sm font-bold text-sidebar-accent-foreground">
                    {session.membership.centerName ||
                      tCommon("dashboard.defaultCenter")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-sidebar-border bg-white p-3 shadow-sm group-data-[collapsible=icon]:hidden">
              <div className="relative flex items-center gap-2.5">
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white",
                    // The teacher echoes the phone's flat blue tab accent; the
                    // parent keeps the candy gradient.
                    isTeacher
                      ? "bg-primary"
                      : "bg-gradient-to-br from-primary via-sky to-grape",
                  )}
                >
                  <School className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    {tCommon("dashboard.panel", { role: roleLabel })}
                  </p>
                  <p className="truncate text-sm font-bold text-sidebar-foreground">
                    {(isParent && selectedChild?.centerName) ||
                      session.membership.centerName ||
                      tCommon("dashboard.defaultCenter")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="px-1">
          <SidebarNavMenu
            groups={groupedNav}
            pathname={pathname}
            tNav={tNav}
            serious={isDirector}
          />
        </SidebarContent>

        <SidebarFooter className="p-2">
          <SidebarMenu>
            {showMyPage ? (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/dashboard/profile")}
                  tooltip={tNav("items.myPage")}
                  className="h-auto py-2"
                >
                  <Link href="/dashboard/profile">
                    {isParent && selectedChild ? (
                      <ChildAvatar
                        mediaAssetId={selectedChild.photoMediaAssetId}
                        photoUrl={selectedChild.photoUrl}
                        name={selectedChild.name}
                        className="h-7 w-7 shrink-0"
                        ringClassName="ring-transparent ring-offset-0"
                      />
                    ) : (
                      <CurrentUserAvatar
                        fallbackName={session.user.fullName}
                        className="h-7 w-7 shrink-0"
                        textClassName="text-[10px]"
                      />
                    )}
                    <span className="truncate">{tNav("items.myPage")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}
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

      <SidebarInset
        className={cn(
          "min-w-0",
          isDirector
            ? "bg-director-grid"
            : // Parent and teacher share the phone's flat, calm gray ground — no
              // confetti. Restraint is the point: the candy lives in the tiles.
              "bg-background",
        )}
      >
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="text-foreground" />
              <div className="lg:hidden">
                <BrandMark href="/dashboard" />
              </div>
              {isParent ? (
                // Kidsnote-style: the header belongs to the kid, not the
                // parent — photo + name + a switcher across kindergartens.
                <ChildSwitcher />
              ) : showMyPage ? (
                <Link
                  href="/dashboard/profile"
                  className="hidden min-w-0 items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-muted lg:flex"
                >
                  <CurrentUserAvatar
                    fallbackName={session.user.fullName}
                    className="h-9 w-9 shrink-0"
                    textClassName="text-xs"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {tCommon("dashboard.hello", {
                        name: session.user.fullName,
                      })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {roleLabel}
                      {session.membership.centerName
                        ? ` · ${session.membership.centerName}`
                        : ""}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="hidden min-w-0 lg:block">
                  <p className="truncate text-sm font-bold">
                    {tCommon("dashboard.hello", { name: session.user.fullName })}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {roleLabel}
                    {session.membership.centerName
                      ? ` · ${session.membership.centerName}`
                      : ""}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {!isParent ? (
                <div className="hidden text-right sm:block lg:hidden">
                  <p className="text-sm font-bold">{session.user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              ) : null}
              {showMyPage && !isParent ? (
                <Link
                  href="/dashboard/profile"
                  aria-label={tNav("items.myPage")}
                  className="rounded-full transition-opacity hover:opacity-90 lg:hidden"
                >
                  <CurrentUserAvatar
                    fallbackName={session.user.fullName}
                    className="h-9 w-9"
                    textClassName="text-xs"
                  />
                </Link>
              ) : null}
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
          {isDirector ? (
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          ) : (
            // A single clean blue hairline — parent and teacher share the same
            // composed workspace, no rainbow trim.
            <div className="h-0.5 w-full bg-primary/15" />
          )}
        </header>

        <main
          className={cn(
            "mx-auto w-full min-w-0 max-w-[1240px] animate-fade-in-up px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
            // room for the mobile bottom tab bar so content isn't covered
            isParent && "pb-24 lg:pb-8",
          )}
        >
          <h1 className="sr-only">{pageTitle}</h1>
          {children}
        </main>
      </SidebarInset>

      {isParent ? <ParentBottomNav /> : null}
    </SidebarProvider>
  );
}

type NavGroupView = {
  labelKey: string;
  items: Array<{ href: string; labelKey: string; Icon: typeof LayoutDashboard }>;
};

/**
 * Sidebar navigation. Rendered inside SidebarProvider so it can use
 * `useSidebar` to dismiss the off-canvas menu after a tap on mobile (otherwise
 * the sheet stays open over the page you just navigated to).
 */
function SidebarNavMenu({
  groups,
  pathname,
  tNav,
  serious,
}: {
  groups: NavGroupView[];
  pathname: string;
  tNav: TFunction;
  serious?: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      {groups.map((group) => (
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
                    <Link href={href} onClick={closeOnMobile}>
                      <Icon
                        className={
                          serious
                            ? "text-sidebar-foreground/70"
                            : (navColors[href] ?? "text-primary")
                        }
                      />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}

/** A close (X) button shown only in the mobile off-canvas sidebar. */
function SidebarMobileClose() {
  const { isMobile, setOpenMobile } = useSidebar();
  if (!isMobile) return null;
  return (
    <button
      type="button"
      onClick={() => setOpenMobile(false)}
      aria-label="Close menu"
      className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
    >
      <X className="h-5 w-5" />
    </button>
  );
}
