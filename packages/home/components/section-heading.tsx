"use client";

import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <p
          className={cn(
            "text-sm font-bold uppercase tracking-wider",
            dark ? "text-sunshine" : "text-primary",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "mt-3 font-brand text-3xl font-bold leading-snug sm:text-4xl",
          dark ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed sm:text-lg",
            dark ? "text-white/70" : "text-muted-foreground",
          )}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
