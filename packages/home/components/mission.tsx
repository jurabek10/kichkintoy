"use client";

import {
  BookOpen,
  Bus,
  CalendarCheck2,
  Images,
  Megaphone,
  MessagesSquare,
  Pill,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { HeartDoodle, StarDoodle } from "./doodles";
import { Parallax } from "./parallax";
import { Reveal } from "./reveal";

/* The app's feature icons, scattered around the statement like kidsnote's
   mission section. Same tile colors as the mobile shortcut grid; each floats
   at its own parallax speed so the field drifts apart while scrolling. */
const floats: {
  Icon: LucideIcon;
  bg: string;
  fg: string;
  size: number;
  speed: number;
  className: string;
}[] = [
  { Icon: BookOpen, bg: "#FBEBD2", fg: "#E29A45", size: 64, speed: 0.55, className: "left-[6%] top-[16%]" },
  { Icon: CalendarCheck2, bg: "#DDF3E4", fg: "#46B06A", size: 56, speed: 0.95, className: "left-[22%] top-[2%]" },
  { Icon: Bus, bg: "#DBECFF", fg: "#4D9FEC", size: 66, speed: 0.7, className: "right-[13%] top-[8%]" },
  { Icon: Images, bg: "#FFF1CF", fg: "#F4A621", size: 52, speed: 0.4, className: "right-[4%] top-[44%]" },
  { Icon: Megaphone, bg: "#E1F0FF", fg: "#4D9FEC", size: 48, speed: 0.85, className: "right-[24%] bottom-[6%]" },
  { Icon: Wallet, bg: "#FFE9F2", fg: "#E0559A", size: 58, speed: 0.6, className: "right-[7%] bottom-[18%]" },
  { Icon: CalendarCheck2, bg: "#FFE2DD", fg: "#F05A47", size: 44, speed: 0.3, className: "left-[15%] bottom-[24%]" },
  { Icon: MessagesSquare, bg: "#EEE6FF", fg: "#7C5CD8", size: 60, speed: 0.75, className: "left-[4%] bottom-[6%]" },
  { Icon: UtensilsCrossed, bg: "#FFF6D4", fg: "#EFB019", size: 46, speed: 1.05, className: "left-[38%] bottom-[0%]" },
  { Icon: Pill, bg: "#FFE0E0", fg: "#F0594C", size: 42, speed: 0.5, className: "right-[34%] top-[0%]" },
];

export function Mission() {
  const { t } = useLayoutTranslation("home");

  return (
    <section className="relative overflow-hidden py-28 lg:py-40">
      {/* Parallax icon field (decorative, desktop only) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
        {floats.map(({ Icon, bg, fg, size, speed, className }, index) => (
          <Parallax key={index} speed={speed} className={`absolute ${className}`}>
            <span
              className="grid place-items-center rounded-2xl shadow-card"
              style={{ backgroundColor: bg, width: size, height: size }}
            >
              <Icon style={{ color: fg, width: size * 0.46, height: size * 0.46 }} />
            </span>
          </Parallax>
        ))}
        <Parallax speed={0.9} className="absolute left-[18%] top-[34%]">
          <StarDoodle className="h-6 w-6" />
        </Parallax>
        <Parallax speed={0.45} className="absolute right-[16%] bottom-[34%]">
          <HeartDoodle className="h-7 w-8" />
        </Parallax>
      </div>

      <Reveal className="container relative mx-auto max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-primary">
          {t("mission.eyebrow")}
        </p>
        <h2 className="mt-4 font-brand text-3xl font-bold leading-snug text-foreground sm:text-4xl lg:text-[2.9rem]">
          {t("mission.title")}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t("mission.body")}
        </p>
      </Reveal>
    </section>
  );
}
