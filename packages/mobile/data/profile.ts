/**
 * Account (My Page) data access — the parent's own profile plus the editable
 * details of each child they guard. Mirrors the web's profile cards, reading the
 * shared `orpc.profile.*` endpoints.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

export type Profile = Awaited<ReturnType<typeof orpc.profile.get>>;
export type ParentChild = Awaited<ReturnType<typeof orpc.profile.listChildren>>[number];

/** The signed-in parent's account view (identity, contact, notification settings). */
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: () => orpc.profile.get({}),
  });
}

/** The parent's children with their editable details and photos. */
export function useParentChildren() {
  return useQuery({
    queryKey: queryKeys.profile.children,
    queryFn: () => orpc.profile.listChildren({}),
  });
}

/** Push a fresh profile into the cache so every screen updates at once. */
export function useApplyProfile() {
  const queryClient = useQueryClient();
  return (next: Profile) => {
    queryClient.setQueryData(queryKeys.profile.me, next);
    void queryClient.invalidateQueries({ queryKey: ['media', 'download'] });
  };
}

/** Replace one child in the cached list after an edit. */
export function useApplyChild() {
  const queryClient = useQueryClient();
  return (next: ParentChild) => {
    queryClient.setQueryData(queryKeys.profile.children, (list: ParentChild[] | undefined) =>
      list?.map((child) => (child.id === next.id ? next : child)),
    );
    // The reports/home children list (with photos) should refresh too.
    void queryClient.invalidateQueries({ queryKey: queryKeys.parent.children });
    void queryClient.invalidateQueries({ queryKey: ['media', 'download'] });
  };
}
