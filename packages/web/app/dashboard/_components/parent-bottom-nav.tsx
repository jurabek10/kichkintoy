"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Bell, CalendarCheck, FileText, Home, Images } from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";

/**
 * Persistent bottom tab bar for parents on mobile — the primary navigation on
 * phones (KidsNote-style). Hidden on lg+ where the sidebar takes over.
 */
const ITEMS: Array<{ href: string; labelKey: string; Icon: LucideIcon }> = [
  { href: "/dashboard", labelKey: "items.dashboard", Icon: Home },
  { href: "/dashboard/reports", labelKey: "items.reports", Icon: FileText },
  { href: "/dashboard/albums", labelKey: "items.albums", Icon: Images },
  { href: "/dashboard/notices", labelKey: "items.notices", Icon: Bell },
  { href: "/dashboard/pickups", labelKey: "items.pickups", Icon: CalendarCheck },
];

export function ParentBottomNav() {
  const pathname = usePathname();
  const { t } = useLayoutTranslation("nav");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-[680px] items-stretch justify-around px-2">
        {ITEMS.map(({ href, labelKey, Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-bold transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-2xl transition-colors",
                    active ? "bg-primary/12" : "bg-transparent",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="leading-none">{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
