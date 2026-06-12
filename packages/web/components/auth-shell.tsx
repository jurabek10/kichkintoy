import type { ReactNode } from "react";
import Image from "next/image";
import { Building2, GraduationCap, HeartHandshake } from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { BrandMark } from "./brand-mark";

export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useLayoutTranslation("app");

  return (
    <main className="min-h-screen bg-[#fbfdff]">
      <header className="mx-auto flex w-full max-w-shell items-center justify-between px-6 py-5">
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
      <div className="mx-auto grid w-full max-w-shell items-center gap-10 px-6 pb-16 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:pt-10">
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
            />
            <RoleCard
              title={t("authShell.teacher")}
              text={t("authShell.teacherText")}
              Icon={GraduationCap}
            />
            <RoleCard
              title={t("authShell.director")}
              text={t("authShell.directorText")}
              Icon={Building2}
            />
          </div>

          <div className="relative overflow-hidden rounded-2xl border bg-white shadow-card">
            <Image
              src="/images/uzbek-kindergarten-roles.png"
              alt={t("authShell.imageAlt")}
              width={1792}
              height={1024}
              priority
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
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
}: {
  title: string;
  text: string;
  Icon: typeof HeartHandshake;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-card">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-sm font-extrabold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
