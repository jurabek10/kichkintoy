"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn, loginUrl, signupUrl } from "@/lib/utils";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";

const sectionLinks = [
  { href: "#features", key: "nav.features" },
  { href: "#roles", key: "nav.roles" },
  { href: "#payments", key: "nav.payments" },
  { href: "#get-started", key: "nav.getStarted" },
] as const;

export function Navbar() {
  const { t } = useLayoutTranslation("home");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-shadow",
        scrolled || menuOpen
          ? "bg-background/90 shadow-card backdrop-blur"
          : "bg-transparent",
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <a href="#" aria-label="Kichkintoy">
          <Logo />
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-sky hover:text-sky-ink"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <LanguageSwitcher />
          <a
            href={loginUrl}
            className="rounded-full px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-sky"
          >
            {t("nav.login")}
          </a>
          <a
            href={signupUrl}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            {t("nav.signup")}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          className="rounded-full p-2 text-foreground hover:bg-sky lg:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-background/95 pb-6 backdrop-blur lg:hidden">
          <nav className="container flex flex-col gap-1 pt-4">
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/80 hover:bg-sky hover:text-sky-ink"
              >
                {t(link.key)}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-3 px-3">
              <a
                href={signupUrl}
                className="flex-1 rounded-full bg-primary px-5 py-2.5 text-center text-sm font-bold text-primary-foreground shadow-card"
              >
                {t("nav.signup")}
              </a>
              <a
                href={loginUrl}
                className="flex-1 rounded-full bg-white px-5 py-2.5 text-center text-sm font-bold text-primary shadow-card"
              >
                {t("nav.login")}
              </a>
            </div>
            <div className="mt-3 px-3">
              <LanguageSwitcher className="w-fit" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
