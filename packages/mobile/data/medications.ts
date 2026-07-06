/**
 * Medication requests (투약의뢰서) data access — the parent's oRPC queries for
 * their child's requests, the detail, and the create / cancel mutations. The
 * backend (incl. the consent + signature requirement) already exists; this is
 * the mobile read/write seam. Mirrors data/notices.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Query } from '@/data/parent';
import i18n from '@/i18n';
import { formatLongDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

// Derive shapes from the typed client so we never drift from the contract.
type ApiChild = Awaited<ReturnType<typeof orpc.medications.children>>['children'][number];
type ApiSummary = Awaited<ReturnType<typeof orpc.medications.parentList>>[number];
type ApiDetail = Awaited<ReturnType<typeof orpc.medications.detail>>;

export type MedicationStatus = ApiSummary['status'];

// --- View models ----------------------------------------------------------

export type MedicationChildOption = {
  id: string;
  name: string;
  className: string | null;
  centerId: string;
};

export type MedicationSummary = {
  id: string;
  childName: string;
  medicineName: string;
  dosage: string;
  medicationTime: string;
  requestedForDate: string; // "YYYY-MM-DD" — drives the today tray + period filter
  dateLabel: string;
  status: MedicationStatus;
};

export type MedicationDetail = {
  id: string;
  status: MedicationStatus;
  childName: string;
  className: string | null;
  dateLabel: string;
  symptoms: string;
  medicineName: string;
  medicationType: string;
  dosage: string;
  medicationTime: string;
  medicationCount: string | null;
  storageMethod: string | null;
  instructions: string | null;
  specialNote: string | null;
  // Signature: a drawn signature is stored as a media asset referenced by id
  // ("media:<assetId>"); older typed signatures stay as plain text.
  signatureAssetId: string | null;
  signatureText: string | null;
  photoAssetId: string | null;
  // Staff outcome (present once completed).
  administeredByName: string | null;
  administeredDose: string | null;
  staffNote: string | null;
  skippedReason: string | null;
};

// --- Mappers --------------------------------------------------------------

function toSummary(request: ApiSummary): MedicationSummary {
  return {
    id: request.id,
    childName: request.child.name,
    medicineName: request.medicineName,
    dosage: request.dosage,
    medicationTime: request.medicationTime,
    requestedForDate: request.requestedForDate,
    dateLabel: formatLongDate(request.requestedForDate, i18n.language),
    status: request.status,
  };
}

/** A drawn signature is persisted as `media:<assetId>`. */
export const SIGNATURE_MEDIA_PREFIX = 'media:';

function toDetail(request: ApiDetail): MedicationDetail {
  const signature = request.parentSignature ?? '';
  const isMediaSignature = signature.startsWith(SIGNATURE_MEDIA_PREFIX);
  return {
    id: request.id,
    status: request.status,
    childName: request.child.name,
    className: request.child.className,
    dateLabel: formatLongDate(request.requestedForDate, i18n.language),
    symptoms: request.symptoms,
    medicineName: request.medicineName,
    medicationType: request.medicationType,
    dosage: request.dosage,
    medicationTime: request.medicationTime,
    medicationCount: request.medicationCount,
    storageMethod: request.storageMethod,
    instructions: request.instructions,
    specialNote: request.specialNote,
    signatureAssetId: isMediaSignature ? signature.slice(SIGNATURE_MEDIA_PREFIX.length) : null,
    signatureText: isMediaSignature ? null : signature || null,
    photoAssetId: request.photo?.assetId ?? null,
    administeredByName: request.administeredBy?.fullName ?? null,
    administeredDose: request.administeredDose,
    staffNote: request.staffNote,
    skippedReason: request.skippedReason,
  };
}

// --- Hooks ----------------------------------------------------------------

/** The children the parent may request medication for. */
export function useMedicationChildren(): Query<MedicationChildOption[]> {
  const query = useQuery({
    queryKey: queryKeys.medications.children,
    queryFn: () => orpc.medications.children({}),
  });
  const data: MedicationChildOption[] = (query.data?.children ?? []).map((child: ApiChild) => ({
    id: child.id,
    name: child.name,
    className: child.className,
    centerId: child.centerId,
  }));
  return { data, isPending: query.isPending };
}

/** The parent's medication requests, newest first. */
export function useMedicationRequests(): Query<MedicationSummary[]> {
  const query = useQuery({
    queryKey: queryKeys.medications.parentList,
    queryFn: () => orpc.medications.parentList({}),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const data = [...(query.data ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toSummary);
  return { data, isPending: query.isPending };
}

/** One request's detail. Kept fresh so a staff outcome (administered / skipped)
 *  reaches the parent promptly: always revalidate on open/focus, and while the
 *  request is still `pending`, poll so the status flips live on screen. */
export function useMedicationRequest(requestId: string): Query<MedicationDetail | null> {
  const query = useQuery({
    queryKey: queryKeys.medications.detail(requestId),
    queryFn: () => orpc.medications.detail({ requestId }),
    enabled: !!requestId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 15_000 : false),
  });
  return { data: query.data ? toDetail(query.data) : null, isPending: query.isPending };
}

export type CreateMedicationInput = Parameters<typeof orpc.medications.create>[0];

/** Create a request. Returns the new request so the screen can navigate to it. */
export function useCreateMedicationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMedicationInput) => orpc.medications.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.parentList });
    },
  });
}

/** Cancel a pending request, optimistically flipping its status. */
export function useCancelMedicationRequest(requestId: string) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.medications.detail(requestId);
  return useMutation({
    mutationFn: () => orpc.medications.cancel({ requestId }),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.parentList });
    },
  });
}
