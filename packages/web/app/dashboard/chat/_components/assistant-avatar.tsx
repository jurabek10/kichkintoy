import { cn } from "@/lib/utils";
import { KichkintoyMark } from "@/components/kids-decor";

/**
 * The assistant's face — the Kichkintoy "K" brand mark in a soft white squircle.
 * A squircle (not a circle) sets the brand apart from the round person avatars,
 * so every answer reads as coming from Kichkintoy itself.
 */
export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border",
        className,
      )}
      aria-hidden
    >
      <KichkintoyMark className="h-3/5 w-3/5" />
    </span>
  );
}
