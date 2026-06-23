"use client";

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { SignedAvatar } from "./signed-avatar";

/**
 * The signed-in user's avatar, sourced from the cached `profile.get` query so
 * it stays in sync with edits made on the "My Page" screen. Used in the
 * dashboard header and sidebar as a friendly, personal touch.
 */
export function CurrentUserAvatar({
  fallbackName,
  className,
  textClassName,
}: {
  fallbackName: string;
  className?: string;
  textClassName?: string;
}) {
  const { data } = useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => orpc.profile.get({}),
    staleTime: 300_000,
  });

  return (
    <SignedAvatar
      mediaAssetId={data?.avatarMediaAssetId ?? null}
      name={data?.fullName ?? fallbackName}
      className={className}
      textClassName={textClassName}
    />
  );
}
