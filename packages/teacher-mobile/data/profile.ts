/**
 * Account (My Page) data access — the teacher's own profile: identity, contact
 * details, avatar, notification settings, and security. Mirrors the web's
 * profile cards, reading the shared `orpc.profile.*` endpoints.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

export type Profile = Awaited<ReturnType<typeof orpc.profile.get>>;

/** The signed-in user's account view (identity, contact, notification settings). */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: () => orpc.profile.get({}),
  });
}

/** Push a fresh profile into the cache so every screen updates at once. */
export function useApplyProfile() {
  const queryClient = useQueryClient();
  return (next: Profile) => {
    queryClient.setQueryData(queryKeys.profile.me, next);
    // A new avatar reuses the same query key family; drop stale signed URLs.
    void queryClient.invalidateQueries({ queryKey: ['media', 'download'] });
  };
}
