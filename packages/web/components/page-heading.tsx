import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The mobile app stamps every screen with a colored, rounded icon tile; this
 * brings that same cue to the desktop's page headers, so an inner page reads as
 * the same "place" the home tile sent you to. The candy tones map to CSS tokens
 * that each theme remaps (the director's are a muted data-viz family), so one
 * component stays appropriate for teacher and director alike.
 */
const TONES = {
  coral: "bg-coral text-coral-ink",
  sky: "bg-sky text-sky-ink",
  grape: "bg-grape text-grape-ink",
  mint: "bg-mint text-mint-ink",
  sunshine: "bg-sunshine text-sunshine-ink",
} as const;

export type HeadingTone = keyof typeof TONES;

export function PageHeading({
  Icon,
  tone = "sky",
  title,
  description,
  className,
}: {
  Icon: LucideIcon;
  tone?: HeadingTone;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
          TONES[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
