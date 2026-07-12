import Link from "next/link";
import { cn } from "@/lib/utils";
import { KichkintoyMark } from "@/components/kids-decor";

export function BrandMark({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-0.5 no-underline", className)}
    >
      {/* The candy K mark doubles as the word's capital letter… */}
      <KichkintoyMark className="h-6 w-6 shrink-0" />
      {/* …and the rest of the word borrows the mark's own blue arm (#4DABF7).
          A fixed brand hex, not a theme token: pastel remaps washed it out on
          light rails, and it must stay legible on the director's dark rail. */}
      <span className="font-brand text-2xl font-extrabold leading-none tracking-tight text-[#4DABF7]">
        ichkintoy
      </span>
    </Link>
  );
}
