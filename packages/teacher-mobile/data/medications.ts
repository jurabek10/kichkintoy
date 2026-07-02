/**
 * Medication requests (투약의뢰서) data access — staff/author side. The oRPC
 * queries a teacher uses to see the doses parents asked her to give (today, plus
 * a month's history) and the detail, with the completion mutation that files the
 * administration report. Parents create the requests; staff review and complete
 * them. Mirrors the other staff data layers.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CompleteMedicationRequestInput } from '@kichkintoy/shared';
import type { Query } from '@/data/parent';
import i18n from '@/i18n';
import { useCenterId } from '@/data/teacher';
import { formatDayMonthTime, formatLongDate, todayIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

type ApiSummary = Awaited<ReturnType<typeof orpc.medications.staffList>>[number];
type ApiDetail = Awaited<ReturnType<typeof orpc.medications.detail>>;

export type MedicationStatus = ApiSummary['status'];

/** A drawn signature is persisted as `media:<assetId>`. */
export const SIGNATURE_MEDIA_PREFIX = 'media:';

// --- View models -----------------------------------------------------------

export type StaffMedSummary = {
  id: string;
  childName: string;
  className: string | null;
  classId: string | null;
  medicineName: string;
  dosage: string;
  medicationTime: string;
  requestedForDate: string; // "YYYY-MM-DD"
  dateLabel: string;
  status: MedicationStatus;
  photoAssetId: string | null;
};

export type StaffMedDetail = {
  id: string;
  status: MedicationStatus;
  childName: string;
  className: string | null;
  parentName: string;
  dateLabel: string;
  submittedLabel: string;
  symptoms: string;
  medicineName: string;
  medicationType: string;
  dosage: string;
  medicationTime: string;
  medicationCount: string | null;
  storageMethod: string | null;
  instructions: string | null;
  specialNote: string | null;
  photoAssetId: string | null;
  photoCaption: string | null;
  signatureAssetId: string | null;
  signatureText: string | null;
  administeredByName: string | null;
  administeredAtLabel: string | null;
  administeredDose: string | null;
  staffNote: string | null;
  skippedReason: string | null;
};

// --- Mappers ---------------------------------------------------------------

function toSummary(request: ApiSummary): StaffMedSummary {
  return {
    id: request.id,
    childName: request.child.name,
    className: request.child.className,
    classId: request.child.classId,
    medicineName: request.medicineName,
    dosage: request.dosage,
    medicationTime: request.medicationTime,
    requestedForDate: request.requestedForDate,
    dateLabel: formatLongDate(request.requestedForDate, i18n.language),
    status: request.status,
    photoAssetId: request.photo?.assetId ?? null,
  };
}

function toDetail(request: ApiDetail): StaffMedDetail {
  const lang = i18n.language;
  const signature = request.parentSignature ?? '';
  const isMediaSignature = signature.startsWith(SIGNATURE_MEDIA_PREFIX);
  return {
    id: request.id,
    status: request.status,
    childName: request.child.name,
    className: request.child.className,
    parentName: request.parentName,
    dateLabel: formatLongDate(request.requestedForDate, lang),
    submittedLabel: formatDayMonthTime(request.createdAt, lang),
    symptoms: request.symptoms,
    medicineName: request.medicineName,
    medicationType: request.medicationType,
    dosage: request.dosage,
    medicationTime: request.medicationTime,
    medicationCount: request.medicationCount,
    storageMethod: request.storageMethod,
    instructions: request.instructions,
    specialNote: request.specialNote,
    photoAssetId: request.photo?.assetId ?? null,
    photoCaption: request.photoCaption,
    signatureAssetId: isMediaSignature ? signature.slice(SIGNATURE_MEDIA_PREFIX.length) : null,
    signatureText: isMediaSignature ? null : signature || null,
    administeredByName: request.administeredBy?.fullName ?? null,
    administeredAtLabel: request.administeredAt ? formatDayMonthTime(request.administeredAt, lang) : null,
    administeredDose: request.administeredDose,
    staffNote: request.staffNote,
    skippedReason: request.skippedReason,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A "YYYY-MM" month's date-only bounds. */
export function monthBounds(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const lastDay = new Date(year!, monthIndex!, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${pad(lastDay)}` };
}

/** Pending first (what still needs giving), then by child name. */
function byPendingThenName(a: StaffMedSummary, b: StaffMedSummary) {
  if ((a.status === 'pending') !== (b.status === 'pending')) return a.status === 'pending' ? -1 : 1;
  return a.childName.localeCompare(b.childName);
}

// --- Hooks -----------------------------------------------------------------

/** Today's medication requests, pending first. */
export function useTodayMedications(): Query<StaffMedSummary[]> {
  const centerId = useCenterId();
  const date = todayIsoDate();
  const query = useQuery({
    queryKey: teacherQueryKeys.medications(date),
    queryFn: () => orpc.medications.staffList({ centerId: centerId ?? '', date }),
    enabled: !!centerId,
  });
  return {
    data: (query.data ?? []).map(toSummary).sort(byPendingThenName),
    isPending: !!centerId && query.isPending,
  };
}

/** A month's medication requests, newest first. */
export function useMonthMedications(month: string): Query<StaffMedSummary[]> {
  const centerId = useCenterId();
  const { from, to } = monthBounds(month);
  const query = useQuery({
    queryKey: [...teacherQueryKeys.medications('month'), month] as const,
    queryFn: () => orpc.medications.staffList({ centerId: centerId ?? '', from, to }),
    enabled: !!centerId,
  });
  const data = (query.data ?? [])
    .map(toSummary)
    .sort((a, b) => b.requestedForDate.localeCompare(a.requestedForDate) || byPendingThenName(a, b));
  return { data, isPending: !!centerId && query.isPending };
}

export function useStaffMedication(requestId: string): Query<StaffMedDetail | null> {
  const query = useQuery({
    queryKey: medDetailKey(requestId),
    queryFn: () => orpc.medications.detail({ requestId }),
    enabled: !!requestId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  return { data: query.data ? toDetail(query.data) : null, isPending: !!requestId && query.isPending };
}

/** File the administration report (administered or skipped). */
export function useCompleteMedication(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CompleteMedicationRequestInput) => orpc.medications.complete({ requestId, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'medications'] });
      queryClient.invalidateQueries({ queryKey: medDetailKey(requestId) });
    },
  });
}

function medDetailKey(requestId: string) {
  return ['teacher', 'medication', requestId] as const;
}
