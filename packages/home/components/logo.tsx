import { cn } from "@/lib/utils";

/** The Kichkintoy wordmark — candy "K" mark + Baloo wordmark. */
export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="4 8 88 88"
        fill="none"
        aria-hidden="true"
        className="h-8 w-8"
      >
        <path
          d="M37 52 73 24"
          stroke="#FF7A66"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d="M37 52 73 80"
          stroke="#4DABF7"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <rect x="13" y="18" width="23" height="68" rx="11.5" fill="#FFC53D" />
        <circle cx="24.5" cy="41" r="4.2" fill="#fff" />
        <circle cx="24.5" cy="63" r="4.2" fill="#fff" />
      </svg>
      <span
        className={cn(
          "font-brand text-xl font-bold tracking-tight text-primary",
          wordmarkClassName,
        )}
      >
        Kichkintoy
      </span>
    </span>
  );
}
