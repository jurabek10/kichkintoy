import { oc } from "@orpc/contract";
import {
  addSpecialCommentInputSchema,
  attachSpecialMediaInputSchema,
  createPortfolioExportInputSchema,
  createSpecialistTeacherInputSchema,
  createSpecialScheduleInputSchema,
  createSpecialSessionInputSchema,
  createSpecialSubjectInputSchema,
  generateAiSummaryInputSchema,
  monthlyDevelopmentSummarySchema,
  monthlyProgressInputSchema,
  monthlySubjectProgressListSchema,
  parentSpecialClassFeedItemSchema,
  parentSpecialClassFeedSchema,
  parentSpecialFeedInputSchema,
  payrollReportInputSchema,
  payrollReportSchema,
  portfolioExportIdInputSchema,
  portfolioExportSchema,
  specialCenterInputSchema,
  specialChildIdInputSchema,
  specialClassCommentListSchema,
  specialClassCommentSchema,
  specialClassScheduleListSchema,
  specialClassSessionDetailSchema,
  specialClassSessionListSchema,
  specialCommentsInputSchema,
  specialClassScheduleSchema,
  specialClassSessionSummarySchema,
  specialRubricsInputSchema,
  specialSchedulesInputSchema,
  specialScheduleIdInputSchema,
  specialSessionIdInputSchema,
  specialStaffSessionsInputSchema,
  specialSubjectIdInputSchema,
  specialSubjectListSchema,
  specialSubjectSchema,
  specialSubjectRubricListSchema,
  specialistTeacherSchema,
  specialistTeacherListSchema,
  specialSpecialistIdInputSchema,
  updateDevelopmentSummaryInputSchema,
  updateSessionPayrollInputSchema,
  updateSpecialistTeacherInputSchema,
  updateSpecialScheduleInputSchema,
  updateSpecialSessionInputSchema,
  updateSpecialSubjectInputSchema,
  upsertSpecialObservationInputSchema,
  upsertSpecialRubricInputSchema,
} from "../special-classes.js";
import { mediaDownloadUrlSchema } from "../media.js";

export const specialClassesContract = {
  subjects: oc.input(specialCenterInputSchema).output(specialSubjectListSchema),
  createSubject: oc
    .input(createSpecialSubjectInputSchema)
    .output(specialSubjectSchema),
  updateSubject: oc
    .input(updateSpecialSubjectInputSchema)
    .output(specialSubjectSchema),
  archiveSubject: oc
    .input(specialSubjectIdInputSchema)
    .output(specialSubjectSchema),

  specialists: oc
    .input(specialCenterInputSchema)
    .output(specialistTeacherListSchema),
  createSpecialist: oc
    .input(createSpecialistTeacherInputSchema)
    .output(specialistTeacherSchema),
  updateSpecialist: oc
    .input(updateSpecialistTeacherInputSchema)
    .output(specialistTeacherSchema),
  archiveSpecialist: oc
    .input(specialSpecialistIdInputSchema)
    .output(specialistTeacherSchema),

  rubrics: oc.input(specialRubricsInputSchema).output(specialSubjectRubricListSchema),
  upsertRubric: oc
    .input(upsertSpecialRubricInputSchema)
    .output(specialSubjectRubricListSchema),

  schedules: oc
    .input(specialSchedulesInputSchema)
    .output(specialClassScheduleListSchema),
  createSchedule: oc
    .input(createSpecialScheduleInputSchema)
    .output(specialClassScheduleSchema),
  updateSchedule: oc
    .input(updateSpecialScheduleInputSchema)
    .output(specialClassScheduleSchema),
  archiveSchedule: oc
    .input(specialScheduleIdInputSchema)
    .output(specialClassScheduleSchema),

  staffSessions: oc
    .input(specialStaffSessionsInputSchema)
    .output(specialClassSessionListSchema),
  sessionDetail: oc
    .input(specialSessionIdInputSchema)
    .output(specialClassSessionDetailSchema),
  createSession: oc
    .input(createSpecialSessionInputSchema)
    .output(specialClassSessionDetailSchema),
  updateSession: oc
    .input(updateSpecialSessionInputSchema)
    .output(specialClassSessionDetailSchema),
  publishSession: oc
    .input(specialSessionIdInputSchema)
    .output(specialClassSessionDetailSchema),
  cancelSession: oc
    .input(specialSessionIdInputSchema)
    .output(specialClassSessionDetailSchema),
  upsertChildObservations: oc
    .input(upsertSpecialObservationInputSchema)
    .output(specialClassSessionDetailSchema),
  attachMedia: oc
    .input(attachSpecialMediaInputSchema)
    .output(specialClassSessionDetailSchema),

  parentFeed: oc
    .input(parentSpecialFeedInputSchema)
    .output(parentSpecialClassFeedSchema),
  parentSessionDetail: oc
    .input(specialSessionIdInputSchema.merge(specialChildIdInputSchema))
    .output(parentSpecialClassFeedItemSchema),

  comments: oc
    .input(specialCommentsInputSchema)
    .output(specialClassCommentListSchema),
  addComment: oc
    .input(addSpecialCommentInputSchema)
    .output(specialClassCommentSchema),

  monthlyProgress: oc
    .input(monthlyProgressInputSchema)
    .output(monthlySubjectProgressListSchema),
  generateAiSummary: oc
    .input(generateAiSummaryInputSchema)
    .output(monthlyDevelopmentSummarySchema),
  updateSummaryDraft: oc
    .input(updateDevelopmentSummaryInputSchema)
    .output(monthlyDevelopmentSummarySchema),
  approveSummary: oc
    .input(updateDevelopmentSummaryInputSchema)
    .output(monthlyDevelopmentSummarySchema),

  createPdfPortfolio: oc
    .input(createPortfolioExportInputSchema)
    .output(portfolioExportSchema),
  portfolioDownloadUrl: oc
    .input(portfolioExportIdInputSchema)
    .output(mediaDownloadUrlSchema),

  payrollReport: oc.input(payrollReportInputSchema).output(payrollReportSchema),
  updateSessionPayroll: oc
    .input(updateSessionPayrollInputSchema)
    .output(specialClassSessionSummarySchema),
};
