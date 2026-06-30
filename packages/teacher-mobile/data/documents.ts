/**
 * Student documents (서류) data access — the parent's oRPC queries for the
 * forms the center asked them to complete, plus the save-draft / submit
 * mutations. The backend already exists; this is the mobile read/write seam.
 * Mirrors data/pickups.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Query } from '@/data/parent';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

// Derive shapes from the typed client so we never drift from the contract.
type ApiSummary = Awaited<ReturnType<typeof orpc.studentDocuments.parentRequests>>[number];
type ApiDetail = Awaited<ReturnType<typeof orpc.studentDocuments.parentSubmissionDetail>>;

export type DocumentStatus = ApiSummary['status'];
export type DocumentTemplateType = ApiSummary['templateType'];
export type DocumentField = ApiDetail['fields'][number];
export type DocumentFieldType = DocumentField['type'];
export type DocumentAnswers = ApiDetail['answers'];
export type DocumentAnswerValue = DocumentAnswers[string];
export type DocumentAttachment = ApiDetail['attachments'][number];

// --- View models ----------------------------------------------------------

export type DocumentSummary = {
  id: string;
  requestTitle: string;
  childName: string;
  templateType: DocumentTemplateType;
  status: DocumentStatus;
  dueDate: string | null;
  correctionNote: string | null;
  attachmentCount: number;
  updatedAt: string;
};

export type DocumentDetail = {
  id: string;
  centerId: string;
  requestTitle: string;
  childName: string;
  className: string | null;
  templateType: DocumentTemplateType;
  status: DocumentStatus;
  dueDate: string | null;
  instructions: string | null;
  correctionNote: string | null;
  fields: DocumentField[];
  answers: DocumentAnswers;
  attachments: DocumentAttachment[];
};

// --- Status helpers -------------------------------------------------------

/** A submission is editable by the parent until it is awaiting/closed review. */
const EDITABLE: DocumentStatus[] = ['not_started', 'in_progress', 'needs_correction'];
export const isEditable = (status: DocumentStatus) => EDITABLE.includes(status);

// Action-first ordering: a returned correction is the loudest, then work in
// progress, then untouched; finished ones sink to the bottom.
const STATUS_ORDER: DocumentStatus[] = [
  'needs_correction',
  'in_progress',
  'not_started',
  'submitted',
  'accepted',
  'closed',
];
const ATTENTION: DocumentStatus[] = ['needs_correction', 'in_progress', 'not_started'];

export type DocumentGroupKey = 'attention' | 'submitted';
export type DocumentGroup = { key: DocumentGroupKey; items: DocumentSummary[] };

/** Split the list into "needs your attention" and "submitted", each ordered by
 *  status urgency then recency. Empty groups are dropped. */
export function groupDocuments(items: DocumentSummary[]): DocumentGroup[] {
  const sorted = [...items].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
      b.updatedAt.localeCompare(a.updatedAt),
  );
  const groups: DocumentGroup[] = [
    { key: 'attention', items: sorted.filter((item) => ATTENTION.includes(item.status)) },
    { key: 'submitted', items: sorted.filter((item) => !ATTENTION.includes(item.status)) },
  ];
  return groups.filter((group) => group.items.length > 0);
}

/** Whether a field has a usable answer — drives the completion meter and the
 *  client-side required check before submit. */
export function isAnswered(field: DocumentField, value: DocumentAnswerValue | undefined): boolean {
  if (field.type === 'file' || field.type === 'multi_choice') {
    return Array.isArray(value) && value.length > 0;
  }
  if (field.type === 'checkbox') return value === true;
  return typeof value === 'string' ? value.trim().length > 0 : value != null && value !== false;
}

/** Required-field progress for the completion meter. */
export function completion(fields: DocumentField[], answers: DocumentAnswers) {
  const required = fields.filter((field) => field.required);
  const done = required.filter((field) => isAnswered(field, answers[field.key])).length;
  return { done, total: required.length };
}

// --- Mappers --------------------------------------------------------------

function toSummary(s: ApiSummary): DocumentSummary {
  return {
    id: s.id,
    requestTitle: s.requestTitle,
    childName: s.childName,
    templateType: s.templateType,
    status: s.status,
    dueDate: s.dueDate,
    correctionNote: s.correctionNote,
    attachmentCount: s.attachmentCount,
    updatedAt: s.updatedAt,
  };
}

function toDetail(d: ApiDetail): DocumentDetail {
  return {
    id: d.id,
    centerId: d.centerId,
    requestTitle: d.requestTitle,
    childName: d.childName,
    className: d.className,
    templateType: d.templateType,
    status: d.status,
    dueDate: d.dueDate,
    instructions: d.instructions,
    correctionNote: d.correctionNote,
    fields: d.fields,
    answers: d.answers,
    attachments: d.attachments,
  };
}

// --- Hooks ----------------------------------------------------------------

/** The documents the parent must complete across their children. */
export function useParentDocuments(): Query<DocumentSummary[]> {
  const query = useQuery({
    queryKey: queryKeys.documents.parentList,
    queryFn: () => orpc.studentDocuments.parentRequests(),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  return { data: (query.data ?? []).map(toSummary), isPending: query.isPending };
}

/** One submission's full form. Kept fresh so a returned correction shows up. */
export function useDocumentSubmission(submissionId: string): Query<DocumentDetail | null> {
  const query = useQuery({
    queryKey: queryKeys.documents.detail(submissionId),
    queryFn: () => orpc.studentDocuments.parentSubmissionDetail({ submissionId }),
    enabled: !!submissionId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  return { data: query.data ? toDetail(query.data) : null, isPending: query.isPending };
}

function useInvalidate(submissionId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(submissionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.parentList });
  };
}

/** Save progress without the required-field check. */
export function useSaveDocumentDraft(submissionId: string) {
  const invalidate = useInvalidate(submissionId);
  return useMutation({
    mutationFn: (answers: DocumentAnswers) =>
      orpc.studentDocuments.parentSaveDraft({ submissionId, answers }),
    onSuccess: invalidate,
  });
}

/** Submit for review (server enforces required fields). */
export function useSubmitDocument(submissionId: string) {
  const invalidate = useInvalidate(submissionId);
  return useMutation({
    mutationFn: (answers: DocumentAnswers) =>
      orpc.studentDocuments.parentSubmit({ submissionId, answers }),
    onSuccess: invalidate,
  });
}
