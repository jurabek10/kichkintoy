import { cn } from "@/lib/utils";

/* Kidsnote-style decorative doodles — bright candy hues (the logo's palette),
   scattered around sections and gently animated. All aria-hidden. */

export function SunDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("animate-wiggle-slow", className)}
    >
      <circle cx="32" cy="32" r="13" fill="#FFC53D" />
      <g stroke="#FFC53D" strokeWidth="4" strokeLinecap="round">
        <path d="M32 6v8" />
        <path d="M32 50v8" />
        <path d="M6 32h8" />
        <path d="M50 32h8" />
        <path d="M13 13l6 6" />
        <path d="M45 45l6 6" />
        <path d="M51 13l-6 6" />
        <path d="M19 45l-6 6" />
      </g>
      <circle cx="27.5" cy="30" r="1.8" fill="#B97A00" />
      <circle cx="36.5" cy="30" r="1.8" fill="#B97A00" />
      <path
        d="M27 36c1.6 1.8 3.2 2.6 5 2.6s3.4-.8 5-2.6"
        stroke="#B97A00"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloudDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 56"
      fill="none"
      aria-hidden="true"
      className={cn("animate-drift", className)}
    >
      <path
        d="M26 46h46a14 14 0 0 0 2.8-27.7A20 20 0 0 0 36.6 12 15 15 0 0 0 12 24a12 12 0 0 0 2 22h12z"
        fill="#fff"
      />
      <path
        d="M26 46h46a14 14 0 0 0 2.8-27.7A20 20 0 0 0 36.6 12 15 15 0 0 0 12 24a12 12 0 0 0 2 22h12z"
        fill="#4DABF7"
        fillOpacity="0.12"
      />
    </svg>
  );
}

export function BalloonDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 88"
      fill="none"
      aria-hidden="true"
      className={cn("animate-sway", className)}
    >
      <ellipse cx="24" cy="24" rx="18" ry="22" fill="#FF7A66" />
      <ellipse cx="18" cy="16" rx="5" ry="7" fill="#fff" fillOpacity="0.35" />
      <path d="M21 46l3 5 3-5z" fill="#E0523C" />
      <path
        d="M24 51c-4 10 6 14-2 26"
        stroke="#E0523C"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StarDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("animate-twinkle", className)}
    >
      <path
        d="M20 3l4.6 11.2L36 15.4l-8.7 8 2.3 12L20 29.6 10.4 35.4l2.3-12L4 15.4l11.4-1.2z"
        fill="#FFC53D"
      />
    </svg>
  );
}

export function SparkDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("animate-twinkle", className)}
    >
      <path
        d="M16 2c1.4 7.4 6.6 12.6 14 14-7.4 1.4-12.6 6.6-14 14-1.4-7.4-6.6-12.6-14-14 7.4-1.4 12.6-6.6 14-14z"
        fill="#4DABF7"
      />
    </svg>
  );
}

export function PlaneDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 72 60"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Dashed flight trail */}
      <path
        d="M4 54c10-4 16-12 20-22"
        stroke="#FF9EB1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="1 7"
      />
      {/* Paper plane */}
      <path d="M30 26L68 8 52 44l-8-12z" fill="#FF7A66" />
      <path d="M30 26l38-18-24 22z" fill="#FF9C8C" />
      <path d="M44 30l24-22-16 36z" fill="#E0523C" />
    </svg>
  );
}

export function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 36"
      fill="none"
      aria-hidden="true"
      className={cn("animate-float-slow", className)}
    >
      <path
        d="M20 33S3.6 23.2 3.6 12.4C3.6 6.6 8.2 2 14 2c2.6 0 5 1 6 2.8C21 3 23.4 2 26 2c5.8 0 10.4 4.6 10.4 10.4C36.4 23.2 20 33 20 33z"
        fill="#FF9EB1"
      />
    </svg>
  );
}
