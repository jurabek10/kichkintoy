"use client";

import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  Images,
  MessagesSquare,
  NotebookPen,
  Pill,
  Plus,
  UtensilsCrossed,
} from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

const items = [
  { key: "reports", Icon: NotebookPen, tint: "bg-coral text-coral-ink" },
  { key: "albums", Icon: Images, tint: "bg-grape text-grape-ink" },
  { key: "attendance", Icon: ClipboardCheck, tint: "bg-mint text-mint-ink" },
  { key: "calendar", Icon: CalendarDays, tint: "bg-sky text-sky-ink" },
  { key: "meals", Icon: UtensilsCrossed, tint: "bg-sunshine text-sunshine-ink" },
  { key: "medications", Icon: Pill, tint: "bg-bubblegum text-bubblegum-ink" },
  { key: "chat", Icon: MessagesSquare, tint: "bg-sky text-sky-ink" },
  { key: "documents", Icon: FileText, tint: "bg-mint text-mint-ink" },
] as const;

/** Kidsnote's "Make special communication" band: bright app-blue ground,
 *  big white cards in two columns. Hovering a card lifts it, spins the plus
 *  into a close, wiggles the icon and unfolds an extra detail paragraph. */
export function Features() {
  const { t } = useLayoutTranslation("home");

  return (
    <section id="features" className="scroll-mt-20 bg-primary">
      <div className="container py-20 lg:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-brand text-3xl font-bold text-white sm:text-4xl">
            {t("features.title")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/80">
            {t("features.subtitle")}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {items.map(({ key, Icon, tint }, index) => (
            <Reveal key={key} delay={(index % 2) * 100}>
              <div className="group relative h-full overflow-hidden rounded-[2rem] bg-white p-8 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-pop lg:p-10">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="max-w-[26rem] font-brand text-xl font-bold leading-snug text-foreground sm:text-2xl">
                    {t(`features.${key}.title`)}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-border text-muted-foreground transition-transform duration-300 group-hover:rotate-45 group-hover:border-primary group-hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </div>

                <p className="mt-3 max-w-[26rem] text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t(`features.${key}.description`)}
                </p>

                {/* Extra detail — unfolds on hover / keyboard focus */}
                <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    <p className="mt-3 max-w-[26rem] rounded-2xl bg-muted p-4 text-sm font-medium leading-relaxed text-foreground/80">
                      {t(`features.${key}.more`)}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    "mt-6 grid h-14 w-14 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6",
                    tint,
                  )}
                >
                  <Icon className="h-7 w-7" />
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
