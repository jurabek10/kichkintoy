import { KidSun } from "@/components/kids-decor";
import { cn } from "@/lib/utils";

/**
 * KidsLoader — a friendly, lightweight loading state: a gently bobbing sun over
 * three bouncing candy dots. Pure SVG + CSS (no three.js), so it's cheap enough
 * to use anywhere a query is in flight. For the heavier "app is booting" moment
 * we still use the full <KidsToys3D /> scene.
 *
 * Respects prefers-reduced-motion (animations pause) and announces politely to
 * screen readers.
 */
export function KidsLoader({
  label,
  size = "md",
  className,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sun =
    size === "sm" ? "h-10 w-10" : size === "lg" ? "h-20 w-20" : "h-14 w-14";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-8 text-center",
        className,
      )}
    >
      <KidSun
        className={cn(
          "animate-float text-sunshine drop-shadow-sm motion-reduce:animate-none",
          sun,
        )}
      />
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-coral [animation-delay:0ms] motion-reduce:animate-none" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-sky [animation-delay:150ms] motion-reduce:animate-none" />
        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-mint [animation-delay:300ms] motion-reduce:animate-none" />
      </div>
      {label ? (
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
