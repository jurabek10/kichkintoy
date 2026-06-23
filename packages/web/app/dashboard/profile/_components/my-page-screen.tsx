"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { MyChildrenCard } from "./my-children-card";
import { MyClassesCard } from "./my-classes-card";
import { NotificationsCard } from "./notifications-card";
import { ProfileCard } from "./profile-card";
import { SecurityCard } from "./security-card";

export function MyPageScreen() {
  const { t } = useLayoutTranslation("profile");
  const {
    data: profile,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => orpc.profile.get({}),
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {isPending ? (
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {profile.role === "parent" ? (
            <>
              {/* Children are the hero of a parent's page (Kidsnote-style):
                  their photos come first, the parent's own details follow. */}
              <MyChildrenCard />
              <ProfileCard profile={profile} />
            </>
          ) : (
            <>
              <ProfileCard profile={profile} />
              {profile.teacher ? <MyClassesCard /> : null}
            </>
          )}
          <SecurityCard />
          <NotificationsCard profile={profile} />
        </div>
      )}
    </div>
  );
}
