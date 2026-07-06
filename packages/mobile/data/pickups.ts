/**
 * Pickup notices (하원 알림) data access — the parent's oRPC queries for their
 * child's notices, the detail, and the create / update / cancel mutations. The
 * backend already exists; this is the mobile read/write seam. Mirrors
 * data/medications.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Query } from '@/data/parent';
import i18n from '@/i18n';
import { formatLongDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

// Derive shapes from the typed client so we never drift from the contract.
type ApiChild = Awaited<ReturnType<typeof orpc.pickups.children>>['children'][number];
type ApiSummary = Awaited<ReturnType<typeof orpc.pickups.parentList>>[number];
type ApiDetail = Awaited<ReturnType<typeof orpc.pickups.detail>>;

export type PickupStatus = ApiSummary['status'];
export type PickupRelationship = ApiSummary['relationship'];

// --- View models ----------------------------------------------------------

export type PickupChildOption = {
  id: string;
  name: string;
  className: string | null;
  centerId: string;
};

export type PickupSummary = {
  id: string;
  childId: string;
  childName: string;
  personName: string;
  relationship: PickupRelationship;
  pickupDate: string;
  pickupTime: string;
  dateLabel: string;
  status: PickupStatus;
};

export type PickupDetail = {
  id: string;
  status: PickupStatus;
  childName: string;
  className: string | null;
  parentName: string;
  pickupDate: string;
  pickupTime: string;
  dateLabel: string;
  personName: string;
  relationship: PickupRelationship;
  note: string | null;
  acknowledgedByName: string | null;
  acknowledgedAtLabel: string | null;
};

// --- Mappers --------------------------------------------------------------

function toSummary(notice: ApiSummary): PickupSummary {
  return {
    id: notice.id,
    childId: notice.child.id,
    childName: notice.child.name,
    personName: notice.pickupPersonName,
    relationship: notice.relationship,
    pickupDate: notice.pickupDate,
    pickupTime: notice.pickupTime,
    dateLabel: formatLongDate(notice.pickupDate, i18n.language),
    status: notice.status,
  };
}

function toDetail(notice: ApiDetail): PickupDetail {
  return {
    id: notice.id,
    status: notice.status,
    childName: notice.child.name,
    className: notice.child.className,
    parentName: notice.parentName,
    pickupDate: notice.pickupDate,
    pickupTime: notice.pickupTime,
    dateLabel: formatLongDate(notice.pickupDate, i18n.language),
    personName: notice.pickupPersonName,
    relationship: notice.relationship,
    note: notice.note,
    acknowledgedByName: notice.acknowledgedBy?.fullName ?? null,
    acknowledgedAtLabel: notice.acknowledgedAt
      ? formatLongDate(notice.acknowledgedAt.slice(0, 10), i18n.language)
      : null,
  };
}

// --- Hooks ----------------------------------------------------------------

/** The children the parent may file a pickup notice for. */
export function usePickupChildren(): Query<PickupChildOption[]> {
  const query = useQuery({
    queryKey: queryKeys.pickups.children,
    queryFn: () => orpc.pickups.children({}),
  });
  const data: PickupChildOption[] = (query.data?.children ?? []).map((child: ApiChild) => ({
    id: child.id,
    name: child.name,
    className: child.className,
    centerId: child.centerId,
  }));
  return { data, isPending: query.isPending };
}

/** The parent's pickup notices, newest first. */
export function usePickupNotices(): Query<PickupSummary[]> {
  const query = useQuery({
    queryKey: queryKeys.pickups.parentList,
    queryFn: () => orpc.pickups.parentList({}),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  // Newest pickup date first (tie-break on submission) so the month grouping
  // reads top-down from the most recent plans.
  const data = [...(query.data ?? [])]
    .sort(
      (a, b) =>
        b.pickupDate.localeCompare(a.pickupDate) || b.createdAt.localeCompare(a.createdAt),
    )
    .map(toSummary);
  return { data, isPending: query.isPending };
}

/** One notice's detail. Kept fresh so a staff acknowledgement reaches the
 *  parent promptly: revalidate on open/focus, and poll while it's still
 *  awaiting confirmation (submitted / changed). */
export function usePickupNotice(noticeId: string): Query<PickupDetail | null> {
  const query = useQuery({
    queryKey: queryKeys.pickups.detail(noticeId),
    queryFn: () => orpc.pickups.detail({ noticeId }),
    enabled: !!noticeId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === 'submitted' || status === 'changed' ? 15_000 : false;
    },
  });
  return { data: query.data ? toDetail(query.data) : null, isPending: query.isPending };
}

export type CreatePickupInput = Parameters<typeof orpc.pickups.create>[0];
export type UpdatePickupBody = Parameters<typeof orpc.pickups.update>[0]['body'];

/** Create a notice. Returns the new notice so the screen can navigate to it. */
export function useCreatePickupNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePickupInput) => orpc.pickups.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pickups.parentList });
    },
  });
}

/** Edit a notice (flips the status to `changed`). */
export function useUpdatePickupNotice(noticeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePickupBody) => orpc.pickups.update({ noticeId, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pickups.detail(noticeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pickups.parentList });
    },
  });
}

/** Cancel a notice, optimistically flipping its status. */
export function useCancelPickupNotice(noticeId: string) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.pickups.detail(noticeId);
  return useMutation({
    mutationFn: () => orpc.pickups.cancel({ noticeId }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<ApiDetail>(detailKey);
      queryClient.setQueryData<ApiDetail>(detailKey, (current) =>
        current ? { ...current, status: 'cancelled' } : current,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(detailKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.pickups.parentList });
    },
  });
}
