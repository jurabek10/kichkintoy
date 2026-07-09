"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Kidsnote-style scroll parallax: shifts children vertically as the element
 *  travels through the viewport, so siblings with different speeds drift
 *  apart while scrolling. `speed` is roughly the max offset in units of
 *  100px; positive floats against the scroll. Reduced-motion users get a
 *  static layout (listener skipped here, transform cleared in globals.css). */
export function Parallax({
  speed = 0.5,
  className,
  children,
}: {
  speed?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      // -1 while below the viewport, 0 at its center, 1 once above it.
      const progress =
        (rect.top + rect.height / 2 - viewport / 2) /
        (viewport / 2 + rect.height);
      element.style.transform = `translateY(${(-progress * speed * 100).toFixed(1)}px)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [speed]);

  return (
    <div ref={ref} className={cn("parallax will-change-transform", className)}>
      {children}
    </div>
  );
}
