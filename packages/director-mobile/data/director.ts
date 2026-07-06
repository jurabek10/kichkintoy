/**
 * Director data access — the oRPC queries the director's console reads. The
 * home summary carries the whole center's monthly pulse (headcount, tuition
 * collection, per-class breakdown, and what needs the director's decision).
 */
import { useQuery } from '@tanstack/react-query';

import type { DirectorHomeSummary } from '@kichkintoy/shared';
import type { Query } from '@/data/parent';
import { useCenterId } from '@/data/teacher';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

export type { DirectorHomeSummary };

/** The center's monthly console summary. */
export function useDirectorHome(): Query<DirectorHomeSummary | null> {
  const centerId = useCenterId();
  const query = useQuery({
    queryKey: queryKeys.director.homeSummary(centerId ?? ''),
    queryFn: () => orpc.director.homeSummary({ centerId: centerId! }),
    enabled: !!centerId,
    staleTime: 60_000,
    refetchOnMount: 'always',
  });
  return { data: query.data ?? null, isPending: !!centerId && query.isPending };
}

/** Whole-number percentage of part/whole, guarding divide-by-zero. */
export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

/** "12.500.000 so'm" — UZS with dotted thousands, the Uzbek money convention. */
export function formatMoney(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${grouped} so'm`;
}
