import { Card } from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { cn } from "@/lib/utils";

/**
 * A standalone loading panel: the friendly <KidsLoader /> inside a Card. Use
 * this for the common "list is loading" state so every screen across the app
 * shows the same playful loader instead of bare "Loading…" text.
 */
export function LoadingCard({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Card className={cn("p-6", className)}>
      <KidsLoader label={label} size="sm" />
    </Card>
  );
}
