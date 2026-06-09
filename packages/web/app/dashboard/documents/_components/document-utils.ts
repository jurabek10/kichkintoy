import type {
  StudentDocumentField,
  StudentDocumentSubmissionStatus,
  StudentDocumentTemplateType,
} from "@kichkintoy/shared";

export function templateTypeLabel(type: StudentDocumentTemplateType | string) {
  const labels: Record<string, string> = {
    admission: "Admission form",
    medical_allergy: "Medical / allergy",
    emergency_contact: "Emergency contact",
    consent: "Consent form",
    file_upload: "File upload",
    custom: "Custom",
  };
  return labels[type] ?? type;
}

export function submissionStatusLabel(
  status: StudentDocumentSubmissionStatus | string,
) {
  const labels: Record<string, string> = {
    not_started: "Not started",
    in_progress: "In progress",
    submitted: "Submitted",
    needs_correction: "Needs correction",
    accepted: "Accepted",
    closed: "Closed",
  };
  return labels[status] ?? status;
}

export const defaultMedicalFields: StudentDocumentField[] = [
  {
    key: "allergies",
    label: "Allergies",
    type: "long_text",
    required: true,
  },
  {
    key: "medical_notes",
    label: "Medical notes",
    type: "long_text",
    required: false,
  },
  {
    key: "emergency_contact",
    label: "Emergency contact",
    type: "short_text",
    required: true,
  },
  {
    key: "parent_signature",
    label: "Parent signature",
    type: "signature",
    required: true,
  },
  {
    key: "document_files",
    label: "Supporting document",
    type: "file",
    required: false,
    maxFiles: 5,
  },
];
