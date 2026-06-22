import type { TFunction } from "i18next";
import type {
  StudentDocumentField,
  StudentDocumentSubmissionStatus,
  StudentDocumentTemplateType,
} from "@kichkintoy/shared";

export function templateTypeKey(type: StudentDocumentTemplateType | string) {
  if (type === "admission") return "templateType.admission";
  if (type === "medical_allergy") return "templateType.medicalAllergy";
  if (type === "emergency_contact") return "templateType.emergencyContact";
  if (type === "consent") return "templateType.consent";
  if (type === "file_upload") return "templateType.fileUpload";
  return "templateType.custom";
}

export function requestStatusKey(status: string) {
  if (status === "draft") return "requestStatus.draft";
  if (status === "sent") return "requestStatus.sent";
  if (status === "archived") return "requestStatus.archived";
  return "requestStatus.closed";
}

export function submissionStatusKey(
  status: StudentDocumentSubmissionStatus | string,
) {
  if (status === "not_started") return "status.notStarted";
  if (status === "in_progress") return "status.inProgress";
  if (status === "submitted") return "status.submitted";
  if (status === "needs_correction") return "status.needsCorrection";
  if (status === "accepted") return "status.accepted";
  return "status.closed";
}

export function buildDefaultMedicalFields(
  t: TFunction<"documents">,
): StudentDocumentField[] {
  return [
    {
      key: "allergies",
      label: t("fields.allergies"),
      type: "long_text",
      required: true,
    },
    {
      key: "medical_notes",
      label: t("fields.medicalNotes"),
      type: "long_text",
      required: false,
    },
    {
      key: "emergency_contact",
      label: t("fields.emergencyContact"),
      type: "short_text",
      required: true,
    },
    {
      key: "parent_signature",
      label: t("fields.parentSignature"),
      type: "signature",
      required: true,
    },
    {
      key: "document_files",
      label: t("fields.supportingDocument"),
      type: "file",
      required: false,
      maxFiles: 5,
    },
  ];
}
