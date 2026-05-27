import Link from "next/link";
import { cn } from "@/lib/utils";

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
        "inline-flex items-center gap-2 text-foreground no-underline",
        className,
      )}
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-base font-black text-primary-foreground">
        K
      </span>
      <span className="text-lg font-extrabold tracking-tight">Kichkintoy</span>
    </Link>
  );
}
