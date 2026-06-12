import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  KidBall,
  KidBalloon,
  KidBlocks,
  KidBook,
  KidCloud,
  KidPencil,
  KidStar,
  KidSun,
} from "@/components/kids-decor";

/** A floating, gently-animated wrapper so toys bob at staggered offsets. */
function Float({
  children,
  className,
  delay = 0,
  slow = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  slow?: boolean;
}) {
  return (
    <span
      className={cn(
        "absolute",
        slow ? "animate-float-slow" : "animate-float",
        className,
      )}
      style={{ animationDelay: `${delay}s` } as CSSProperties}
    >
      {children}
    </span>
  );
}

function Tile({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid aspect-square place-items-center rounded-2xl shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Animated kindergarten scene for the sign-in / sign-up pages — a playful
 * "app card" with a sunny sky and toy tiles, ringed by floating books, blocks,
 * balloons, a ball and a pencil. KidsNote-spirited.
 */
export function AuthHeroScene({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-sm py-8", className)}>
      {/* floating toys around the card */}
      <Float className="-left-6 top-2 text-white" delay={0}>
        <KidCloud className="h-10 w-20" />
      </Float>
      <Float className="-right-4 -top-3" delay={0.6} slow>
        <KidBalloon className="h-20 w-12 text-coral" />
      </Float>
      <Float className="-right-7 top-24" delay={0.2}>
        <KidPencil className="h-14 w-14" />
      </Float>
      <Float className="-left-8 top-28" delay={0.9} slow>
        <KidBook className="h-14 w-16" />
      </Float>
      <Float className="-bottom-3 -left-3" delay={0.4}>
        <KidBlocks className="h-16 w-16" />
      </Float>
      <Float className="-bottom-4 right-2" delay={1} slow>
        <KidBall className="h-12 w-12" />
      </Float>
      <KidStar className="absolute right-10 top-1 h-5 w-5 animate-float text-sunshine" />
      <KidStar className="absolute left-12 bottom-6 h-4 w-4 animate-float-slow text-grape" />

      {/* the app card */}
      <div className="relative -rotate-3 rounded-[2rem] border-[5px] border-white bg-white p-4 shadow-pop">
        <div className="relative mb-4 h-28 overflow-hidden rounded-2xl bg-gradient-to-b from-sky to-mint">
          <KidSun className="absolute right-3 top-2 h-16 w-16 animate-float text-sunshine" />
          <Float className="left-4 top-7 text-white" delay={0.5} slow>
            <KidCloud className="h-6 w-12" />
          </Float>
          <div className="absolute -bottom-8 left-0 h-16 w-full rounded-[50%] bg-mint" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Tile className="bg-coral/15">
            <KidBook className="h-10 w-12" />
          </Tile>
          <Tile className="bg-sky/15">
            <KidBall className="h-9 w-9" />
          </Tile>
          <Tile className="bg-mint/15">
            <KidBlocks className="h-10 w-10" />
          </Tile>
          <Tile className="bg-grape/15">
            <KidStar className="h-8 w-8 text-grape" />
          </Tile>
        </div>
      </div>
    </div>
  );
}
