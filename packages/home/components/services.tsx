"use client";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Globe,
  Images,
  Megaphone,
  MonitorSmartphone,
  NotebookPen,
  PersonStanding,
  Pill,
  Sparkles,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

const services = [
  { key: "ai", Icon: Sparkles, tint: "bg-grape text-grape-ink", href: "#showcase" },
  { key: "reports", Icon: NotebookPen, tint: "bg-coral text-coral-ink", href: "#showcase" },
  { key: "attendance", Icon: ClipboardCheck, tint: "bg-mint text-mint-ink", href: "#showcase" },
  { key: "albums", Icon: Images, tint: "bg-sunshine text-sunshine-ink", href: "#showcase" },
  { key: "payments", Icon: Wallet, tint: "bg-bubblegum text-bubblegum-ink", href: "#payments" },
  { key: "documents", Icon: FileText, tint: "bg-sky text-sky-ink", href: "#showcase" },
  { key: "notices", Icon: Megaphone, tint: "bg-sky text-sky-ink", href: "#features" },
  { key: "calendar", Icon: CalendarDays, tint: "bg-coral text-coral-ink", href: "#features" },
  { key: "meals", Icon: UtensilsCrossed, tint: "bg-sunshine text-sunshine-ink", href: "#features" },
  { key: "medications", Icon: Pill, tint: "bg-bubblegum text-bubblegum-ink", href: "#features" },
  { key: "pickups", Icon: PersonStanding, tint: "bg-sky text-sky-ink", href: "#features" },
  { key: "notifications", Icon: Bell, tint: "bg-coral text-coral-ink", href: "#features" },
  { key: "languages", Icon: Globe, tint: "bg-mint text-mint-ink", href: "#features" },
  { key: "apps", Icon: MonitorSmartphone, tint: "bg-grape text-grape-ink", href: "#roles" },
] as const;

/** Kidsnote's "How about these services?" band: slate ground and a card
 *  carousel that glides by itself — the track holds the list twice and a
 *  marquee animation slides one list-width for a seamless loop. Hover pauses
 *  it; reduced-motion turns it into a plain scrollable row. */
export function Services() {
  const { t } = useLayoutTranslation("home");

  return (
    <section id="services" className="scroll-mt-20 overflow-hidden bg-[#46536B]">
      <div className="py-20 lg:py-24">
        <Reveal className="container text-center">
          <p className="text-lg font-semibold text-white/70">
            {t("services.eyebrow")}
          </p>
          <h2 className="mt-2 font-brand text-3xl font-bold text-white sm:text-4xl">
            {t("services.title")}
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max animate-marquee gap-6 pr-6 hover:[animation-play-state:paused]">
              {[0, 1].map((copy) => (
                <div
                  key={copy}
                  aria-hidden={copy === 1 || undefined}
                  className="flex shrink-0 gap-6"
                >
                  {services.map(({ key, Icon, tint, href }) => (
                    <div
                      key={key}
                      className="flex w-[320px] shrink-0 flex-col rounded-3xl bg-white p-7 transition-transform duration-300 hover:-translate-y-1.5"
                    >
                      <span
                        className={cn(
                          "grid h-16 w-16 place-items-center rounded-2xl",
                          tint,
                        )}
                      >
                        <Icon className="h-8 w-8" />
                      </span>
                      <h3 className="mt-5 font-brand text-xl font-bold text-foreground">
                        {t(`services.items.${key}.title`)}
                      </h3>
                      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">
                        {t(`services.items.${key}.description`)}
                      </p>
                      <a
                        href={href}
                        tabIndex={copy === 1 ? -1 : undefined}
                        className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.04] active:scale-[0.97]"
                      >
                        {t("services.cta")}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
