"use client";

import { useQuery } from "@tanstack/react-query";
import { Baby } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { ChildCard } from "./child-card";

// Stable, distinct candy accent per child — mirrors the parent home palette.
const RING_COLORS = [
  "ring-sky",
  "ring-bubblegum",
  "ring-grape",
  "ring-mint",
  "ring-coral",
];

export function MyChildrenCard() {
  const { t } = useLayoutTranslation("profile");

  const {
    data: children = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.profile.children(),
    queryFn: () => orpc.profile.listChildren({}),
  });

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-bold tracking-tight">
          {t("children.title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("children.subtitle")}</p>
      </div>

      {isPending ? (
        <Card>
          <CardContent className="py-6">
            <KidsLoader label={t("children.loading")} size="sm" />
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <Baby className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              {t("children.empty")}
            </p>
          </CardContent>
        </Card>
      ) : (
        children.map((child, index) => (
          <ChildCard
            key={child.id}
            child={child}
            ringClassName={RING_COLORS[index % RING_COLORS.length]}
          />
        ))
      )}
    </section>
  );
}
