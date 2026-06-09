import { oc } from "@orpc/contract";
import {
  childSafetySummaryInputSchema,
  createStudentDocumentTemplateInputSchema,
  parentSaveStudentDocumentDraftInputSchema,
  parentStudentDocumentRequestsInputSchema,
  parentSubmitStudentDocumentInputSchema,
  reviewStudentDocumentSubmissionInputSchema,
  sendStudentDocumentRequestInputSchema,
  studentDocumentRequestIdInputSchema,
  studentDocumentRequestListSchema,
  studentDocumentRequestSummarySchema,
  studentDocumentSafetySummarySchema,
  studentDocumentStaffRequestsInputSchema,
  studentDocumentStaffSubmissionsInputSchema,
  studentDocumentStaffTemplatesInputSchema,
  studentDocumentSubmissionDetailSchema,
  studentDocumentSubmissionIdInputSchema,
  studentDocumentSubmissionListSchema,
  studentDocumentTemplateIdInputSchema,
  studentDocumentTemplateListSchema,
  studentDocumentTemplateSummarySchema,
  updateStudentDocumentTemplateInputSchema,
} from "../student-documents.js";

export const studentDocumentsContract = {
  staffTemplates: oc
    .input(studentDocumentStaffTemplatesInputSchema)
    .output(studentDocumentTemplateListSchema),
  createTemplate: oc
    .input(createStudentDocumentTemplateInputSchema)
    .output(studentDocumentTemplateSummarySchema),
  updateTemplate: oc
    .input(updateStudentDocumentTemplateInputSchema)
    .output(studentDocumentTemplateSummarySchema),
  archiveTemplate: oc
    .input(studentDocumentTemplateIdInputSchema)
    .output(studentDocumentTemplateSummarySchema),
  staffRequests: oc
    .input(studentDocumentStaffRequestsInputSchema)
    .output(studentDocumentRequestListSchema),
  requestDetail: oc
    .input(studentDocumentRequestIdInputSchema)
    .output(studentDocumentRequestSummarySchema),
  sendRequest: oc
    .input(sendStudentDocumentRequestInputSchema)
    .output(studentDocumentRequestSummarySchema),
  closeRequest: oc
    .input(studentDocumentRequestIdInputSchema)
    .output(studentDocumentRequestSummarySchema),
  staffSubmissions: oc
    .input(studentDocumentStaffSubmissionsInputSchema)
    .output(studentDocumentSubmissionListSchema),
  submissionDetail: oc
    .input(studentDocumentSubmissionIdInputSchema)
    .output(studentDocumentSubmissionDetailSchema),
  reviewSubmission: oc
    .input(reviewStudentDocumentSubmissionInputSchema)
    .output(studentDocumentSubmissionDetailSchema),
  parentRequests: oc
    .input(parentStudentDocumentRequestsInputSchema)
    .output(studentDocumentSubmissionListSchema),
  parentSubmissionDetail: oc
    .input(studentDocumentSubmissionIdInputSchema)
    .output(studentDocumentSubmissionDetailSchema),
  parentSaveDraft: oc
    .input(parentSaveStudentDocumentDraftInputSchema)
    .output(studentDocumentSubmissionDetailSchema),
  parentSubmit: oc
    .input(parentSubmitStudentDocumentInputSchema)
    .output(studentDocumentSubmissionDetailSchema),
  childSafetySummary: oc
    .input(childSafetySummaryInputSchema)
    .output(studentDocumentSafetySummarySchema),
};
