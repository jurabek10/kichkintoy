import { cn } from "@/lib/utils";

/**
 * Playful kindergarten decorations — soft clouds, a smiling sun, balloons,
 * rounded stars and blobs. Friendly and emotional, made for kids & parents.
 */

/**
 * The Kichkintoy brand mark — a playful candy-colored "K": a sunshine bar with
 * two friendly dots, plus coral + sky ribbon arms, wearing an Uzbek doʻppi
 * (tubeteika) with white qalampir motifs. KidsNote-spirited, not a copy.
 */
export function KichkintoyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="11 12 74 80"
      fill="none"
      aria-hidden="true"
      className={cn("h-6 w-6", className)}
    >
      {/* bold ribbon arms (drawn first so the bar overlaps their roots) */}
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
      {/* bold sunshine vertical bar */}
      <rect x="13" y="18" width="23" height="68" rx="11.5" fill="#FFC53D" />
      {/* two friendly dots */}
      <circle cx="24.5" cy="41" r="4.2" fill="#fff" />
      <circle cx="24.5" cy="63" r="4.2" fill="#fff" />
    </svg>
  );
}

/** Rounded, chunky star — a brand spark accent. */
export function KidStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={cn("h-6 w-6", className)}
    >
      <path
        d="M50 8c3 0 5.6 1.9 6.6 4.7l7 19.4 20.6.4c6.7.1 9.5 8.6 4.2 12.7l-16.3 12.6 6 19.7c2 6.4-5.3 11.6-10.7 7.7L50 85.3 32.4 97.9c-5.4 3.9-12.7-1.3-10.7-7.7l6-19.7L11.4 57.9c-5.3-4.1-2.5-12.6 4.2-12.7l20.6-.4 7-19.4C44.4 9.9 47 8 50 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Smiling sun — the cheerful hero centerpiece. */
export function KidSun({ className }: { className?: string }) {
  const rays = Array.from({ length: 12 });
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={cn("h-24 w-24", className)}
    >
      <g stroke="currentColor" strokeWidth="6" strokeLinecap="round">
        {rays.map((_, i) => (
          <line
            key={i}
            x1="60"
            y1="8"
            x2="60"
            y2="20"
            transform={`rotate(${i * 30} 60 60)`}
          />
        ))}
      </g>
      <circle cx="60" cy="60" r="30" fill="currentColor" />
      <circle cx="50" cy="56" r="3.5" fill="#fff" />
      <circle cx="70" cy="56" r="3.5" fill="#fff" />
      <path
        d="M50 68c3 4 17 4 20 0"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Fluffy cloud. */
export function KidCloud({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 64"
      fill="none"
      aria-hidden="true"
      className={cn("h-12 w-24", className)}
    >
      <path
        d="M34 56c-13 0-23-9-23-21 0-11 8-20 20-21 4-9 13-14 23-14 12 0 22 8 24 19 9 1 16 8 16 17 0 11-9 21-22 21H34Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Balloon on a string. */
export function KidBalloon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 96"
      fill="none"
      aria-hidden="true"
      className={cn("h-16 w-10", className)}
    >
      <ellipse cx="30" cy="32" rx="24" ry="29" fill="currentColor" />
      <path d="M30 61l-4 6h8l-4-6Z" fill="currentColor" />
      <path
        d="M30 67c6 8-6 14 0 22"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <ellipse cx="22" cy="22" rx="6" ry="8" fill="#fff" opacity="0.45" />
    </svg>
  );
}

/** Soft organic blob — handy background shape. */
export function KidBlob({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      className={cn("h-40 w-40", className)}
    >
      <path
        fill="currentColor"
        d="M44 -62C56 -52 63 -34 67 -16C71 2 71 20 63 35C54 50 37 62 18 68C-2 74 -24 73 -42 63C-60 53 -74 35 -78 15C-82 -5 -76 -27 -63 -42C-50 -57 -30 -65 -10 -68C10 -71 28 -72 44 -62Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

/** Open storybook with a coral bookmark. */
export function KidBook({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 60"
      fill="none"
      aria-hidden="true"
      className={cn("h-12 w-14", className)}
    >
      <path
        d="M36 12C28 6 14 6 6 9v40c8-3 22-3 30 3z"
        fill="#fff"
        stroke="#1C2540"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M36 12c8-6 22-6 30-3v40c-8-3-22-3-30 3z"
        fill="#fff"
        stroke="#1C2540"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M13 19h16M13 26h16M13 33h12M43 19h16M43 26h16M43 33h12"
        stroke="#9CC9F5"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M36 12v43" stroke="#1C2540" strokeWidth="3" />
      <path d="M52 8v15l4-3 4 3V8z" fill="#FF7A66" />
    </svg>
  );
}

/** Stacked ABC building blocks. */
export function KidBlocks({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("h-12 w-12", className)}
    >
      <rect x="5" y="34" width="26" height="26" rx="6" fill="#4DABF7" />
      <rect x="33" y="34" width="26" height="26" rx="6" fill="#3FD0A8" />
      <rect x="19" y="7" width="26" height="26" rx="6" fill="#FF7A66" />
      <text x="32" y="26" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="sans-serif">A</text>
      <text x="18" y="53" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="sans-serif">B</text>
      <text x="46" y="53" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="sans-serif">C</text>
    </svg>
  );
}

/** Playground ball. */
export function KidBall({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("h-10 w-10", className)}
    >
      <circle cx="32" cy="32" r="28" fill="#FFC53D" />
      <path d="M4 32h56" stroke="#fff" strokeWidth="5" />
      <path d="M32 4C16 18 16 46 32 60" stroke="#fff" strokeWidth="5" fill="none" />
      <path d="M32 4C48 18 48 46 32 60" stroke="#fff" strokeWidth="5" fill="none" />
      <circle cx="32" cy="32" r="27" fill="none" stroke="#1C2540" strokeWidth="2.5" />
    </svg>
  );
}

/** Friendly pencil. */
export function KidPencil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("h-12 w-12", className)}
    >
      <g transform="rotate(40 32 32)">
        <rect x="23" y="9" width="18" height="38" fill="#FFC53D" />
        <rect x="23" y="4" width="18" height="6" rx="2.5" fill="#FF8FB1" />
        <rect x="23" y="10" width="18" height="3.5" fill="#4DABF7" />
        <path d="M23 47 32 60 41 47Z" fill="#F2C49B" />
        <path d="M29 54 32 60 35 54Z" fill="#1C2540" />
      </g>
    </svg>
  );
}

/** Candy rainbow strip — sits under headers. */
export function CandyTrim({ className }: { className?: string }) {
  return (
    <div
      className={cn("candy-trim h-1.5 w-full", className)}
      aria-hidden="true"
    />
  );
}
