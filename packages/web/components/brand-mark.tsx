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
      className={cn(
        "group inline-flex items-center gap-1.5 no-underline",
        className,
      )}
    >
      <KichkintoyMark className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-brand text-2xl font-extrabold leading-none tracking-tight text-sky">
        Kichkintoy
      </span>
    </Link>
  );
}
