import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1180px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          deep: "hsl(var(--primary-deep))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        ink: "hsl(var(--foreground))",
        coral: {
          DEFAULT: "hsl(var(--coral))",
          ink: "hsl(var(--coral-ink))",
        },
        sunshine: {
          DEFAULT: "hsl(var(--sunshine))",
          ink: "hsl(var(--sunshine-ink))",
        },
        mint: {
          DEFAULT: "hsl(var(--mint))",
          ink: "hsl(var(--mint-ink))",
        },
        sky: {
          DEFAULT: "hsl(var(--sky))",
          ink: "hsl(var(--sky-ink))",
        },
        grape: {
          DEFAULT: "hsl(var(--grape))",
          ink: "hsl(var(--grape-ink))",
        },
        bubblegum: {
          DEFAULT: "hsl(var(--bubblegum))",
          ink: "hsl(var(--bubblegum-ink))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        brand: [
          "var(--font-brand)",
          "var(--font-kids)",
          "ui-rounded",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 8px 28px rgba(14, 78, 99, 0.07)",
        pop: "0 20px 60px rgba(14, 78, 99, 0.16)",
      },
      maxWidth: {
        shell: "1180px",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "60%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-7px)" },
        },
        sway: {
          "0%, 100%": { transform: "rotate(-5deg) translateY(0)" },
          "50%": { transform: "rotate(5deg) translateY(-6px)" },
        },
        drift: {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(14px)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.82)" },
        },
        "wiggle-slow": {
          "0%, 100%": { transform: "rotate(-6deg)" },
          "50%": { transform: "rotate(6deg)" },
        },
        /* Paper plane: swoops in from the lower left once, then the outer
           wrapper keeps it drifting (pair with a nested animate-float). */
        "fly-in": {
          "0%": {
            opacity: "0",
            transform: "translate(-180px, 140px) rotate(-32deg)",
          },
          "60%": { opacity: "1" },
          "100%": { opacity: "1", transform: "translate(0, 0) rotate(0deg)" },
        },
        /* Bell ring: a quick shake, then a long rest — feels like a real
           notification arriving every few seconds. */
        ring: {
          "0%, 14%, 100%": { transform: "rotate(0deg)" },
          "2%": { transform: "rotate(14deg)" },
          "5%": { transform: "rotate(-12deg)" },
          "8%": { transform: "rotate(9deg)" },
          "11%": { transform: "rotate(-5deg)" },
        },
        /* Soft heartbeat for "live" badges (check-in tick, unread dot). */
        "pulse-soft": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.18)" },
        },
        /* Chat typing dot: bobs and brightens; stagger with animation-delay. */
        "typing-dot": {
          "0%, 60%, 100%": { opacity: "0.35", transform: "translateY(0)" },
          "30%": { opacity: "1", transform: "translateY(-3px)" },
        },
        /* Endless card carousel: the track holds the list twice and slides
           one list-width, so the loop is seamless. */
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pop-in": "pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        float: "float 5s ease-in-out infinite",
        "float-slow": "float 7s ease-in-out infinite",
        sway: "sway 6s ease-in-out infinite",
        drift: "drift 9s ease-in-out infinite",
        twinkle: "twinkle 3.5s ease-in-out infinite",
        "wiggle-slow": "wiggle-slow 7s ease-in-out infinite",
        "fly-in": "fly-in 1.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        ring: "ring 5s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.6s ease-in-out infinite",
        "typing-dot": "typing-dot 1.3s ease-in-out infinite",
        marquee: "marquee 90s linear infinite",
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
