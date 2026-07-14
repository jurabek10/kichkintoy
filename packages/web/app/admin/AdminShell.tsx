"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Timer,
  Wallet,
  X,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { logoutAndClear, readSession, useSession } from "@/lib/session";

const nav = [
  { href: "/admin", labelKey: "nav.overview", Icon: LayoutDashboard },
  { href: "/admin/centers", labelKey: "nav.centers", Icon: Building2 },
  { href: "/admin/billing", labelKey: "nav.billing", Icon: Wallet },
  { href: "/admin/crons", labelKey: "nav.crons", Icon: Timer },
];

/**
 * The founder's console. Wears the director's steel "operations console"
 * theme on purpose — the admin view is the director console zoomed out from
 * one center to the whole platform.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLayoutTranslation("admin");
  const { t: tCommon } = useLayoutTranslation("common");

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    // Everyone who is not the platform admin bounces to their own dashboard.
    if (session.user.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = "director";
    return () => {
      delete root.dataset.theme;
    };
  }, []);

  if (loading || !session || session.user.role !== "super_admin") {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 animate-bounce rounded-full bg-coral [animation-delay:0ms]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-sky [animation-delay:150ms]" />
          <span className="h-3 w-3 animate-bounce rounded-full bg-mint [animation-delay:300ms]" />
        </div>
      </main>
    );
  }

  async function handleSignOut() {
    const stored = readSession();
    await logoutAndClear(stored?.token ?? null);
    router.replace("/login");
  }

  const activeItem = nav.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/admin" && pathname.startsWith(item.href)),
  );
  const pageTitle = activeItem ? t(activeItem.labelKey) : t("shell.panel");

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="relative gap-3 p-3">
          <div className="flex h-12 items-center px-1">
            <BrandMark
              href="/admin"
              className="text-sidebar-foreground group-data-[collapsible=icon]:[&>span:last-child]:hidden"
            />
            <AdminSidebarMobileClose />
          </div>
          <div className="rounded-md border border-sidebar-border bg-sidebar-accent/60 p-3 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/60">
                  {t("shell.panel")}
                </p>
                <p className="truncate text-sm font-bold text-sidebar-accent-foreground">
                  {t("shell.brandSubtitle")}
                </p>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-1">
          <AdminSidebarNav pathname={pathname} />
        </SidebarContent>

        <SidebarFooter className="p-2">
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

      <SidebarInset className="min-w-0 bg-director-grid">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="text-foreground" />
              <div className="lg:hidden">
                <BrandMark href="/admin" />
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-bold">
                  {tCommon("dashboard.hello", { name: session.user.fullName })}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {tCommon("roles.superAdmin")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block lg:hidden">
                <p className="text-sm font-bold">{session.user.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {tCommon("roles.superAdmin")}
                </p>
              </div>
              <LanguageSwitcher />
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
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1240px] animate-fade-in-up px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <h1 className="sr-only">{pageTitle}</h1>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminSidebarNav({ pathname }: { pathname: string }) {
  const { t } = useLayoutTranslation("admin");
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("shell.panel")}</SidebarGroupLabel>
      <SidebarMenu>
        {nav.map(({ href, labelKey, Icon }) => {
          const active =
            pathname === href ||
            (href !== "/admin" && pathname.startsWith(href));
          const label = t(labelKey);
          return (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton asChild isActive={active} tooltip={label}>
                <Link href={href} onClick={closeOnMobile}>
                  <Icon className="text-sidebar-foreground/70" />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function AdminSidebarMobileClose() {
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
