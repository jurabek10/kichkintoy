import type { ReactNode } from "react";
import { Building2, GraduationCap, HeartHandshake } from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { BrandMark } from "./brand-mark";
import { KidCloud, KidSun } from "./kids-decor";
import { AuthHeroScene } from "./kids-scene";

export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useLayoutTranslation("app");

  return (
    <main className="relative min-h-screen overflow-hidden bg-kids-dots">
      <KidCloud className="pointer-events-none absolute left-[8%] top-24 hidden h-12 w-24 animate-float text-white opacity-80 md:block" />
      <KidCloud className="pointer-events-none absolute right-[12%] top-40 hidden h-9 w-20 animate-float-slow text-white opacity-70 lg:block" />
      <KidSun className="pointer-events-none absolute -right-10 -top-10 hidden h-44 w-44 animate-float-slow text-sunshine opacity-90 lg:block" />
      <header className="relative mx-auto flex w-full max-w-shell items-center justify-between px-6 py-5">
        <BrandMark />
        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
          <a href="#roles" className="transition hover:text-primary">
            {t("authShell.navRoles")}
          </a>
          <a href="#center" className="transition hover:text-primary">
            {t("authShell.navCenter")}
          </a>
          <a href="#support" className="transition hover:text-primary">
            {t("authShell.navSupport")}
          </a>
        </nav>
      </header>
      <div className="relative mx-auto grid w-full max-w-shell items-center gap-10 px-6 pb-16 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:pt-10">
        <section className="order-2 flex flex-col gap-8 lg:order-1">
          <div className="max-w-xl">
            <p className="text-sm font-extrabold uppercase text-primary">
              {t("authShell.eyebrow")}
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
              {t("authShell.title")}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
              {t("authShell.description")}
            </p>
          </div>

          <div id="roles" className="grid gap-3 sm:grid-cols-3">
            <RoleCard
              title={t("authShell.parent")}
              text={t("authShell.parentText")}
              Icon={HeartHandshake}
              accent="bg-coral/15 text-coral"
            />
            <RoleCard
              title={t("authShell.teacher")}
              text={t("authShell.teacherText")}
              Icon={GraduationCap}
              accent="bg-mint/15 text-mint"
            />
            <RoleCard
              title={t("authShell.director")}
              text={t("authShell.directorText")}
              Icon={Building2}
              accent="bg-sky/15 text-sky"
            />
          </div>

          <AuthHeroScene />
        </section>

        <section className="order-1 mx-auto w-full max-w-auth-card lg:order-2">
          {children}
        </section>

        {footer ? (
          <div className="order-3 w-full text-center text-sm text-muted-foreground lg:col-start-2">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function RoleCard({
  title,
  text,
  Icon,
  accent,
}: {
  title: string;
  text: string;
  Icon: typeof HeartHandshake;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-transparent bg-white p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-pop">
      <span
        className={`grid h-11 w-11 place-items-center rounded-2xl ${accent}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-sm font-extrabold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
