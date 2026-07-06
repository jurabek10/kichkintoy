import { cn } from "@/lib/utils";

/**
 * The assistant's face — a soft teal-to-mint bubble with a friendly sprout.
 * Deliberately not a generic robot: this is a warm helper for a kindergarten.
 */
export function MascotAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-mint text-primary-foreground shadow-sm",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-1/2 w-1/2">
        <path
          d="M12 21c0-4 0-7 0-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5Zm0-1c2.5 0 4-1.6 4-4-2.5 0-4 1.6-4 4Z"
          fill="currentColor"
        />
        <circle cx="9.5" cy="16" r="1" fill="currentColor" />
        <circle cx="14.5" cy="16" r="1" fill="currentColor" />
      </svg>
    </span>
  );
}
