import { z } from "zod";
import { isoDateSchema, isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const specialSubjectStatusValues = ["active", "archived"] as const;
export const specialSubjectStatusSchema = z.enum(specialSubjectStatusValues);
export type SpecialSubjectStatus = z.infer<typeof specialSubjectStatusSchema>;

export const specialScheduleStatusValues = [
  "active",
  "paused",
  "archived",
] as const;
export const specialScheduleStatusSchema = z.enum(specialScheduleStatusValues);
export type SpecialScheduleStatus = z.infer<typeof specialScheduleStatusSchema>;

export const specialSessionStatusValues = [
  "draft",
  "published",
  "cancelled",
] as const;
export const specialSessionStatusSchema = z.enum(specialSessionStatusValues);
export type SpecialSessionStatus = z.infer<typeof specialSessionStatusSchema>;

export const specialParticipationValues = [
  "active",
  "normal",
  "shy",
  "absent",
] as const;
export const specialParticipationSchema = z.enum(specialParticipationValues);
export type SpecialParticipation = z.infer<typeof specialParticipationSchema>;

export const specialProgressLevelValues = [
  "strong",
  "improving",
  "needs_support",
] as const;
export const specialProgressLevelSchema = z.enum(specialProgressLevelValues);
export type SpecialProgressLevel = z.infer<typeof specialProgressLevelSchema>;

export const specialInterestLevelValues = ["high", "medium", "low"] as const;
export const specialInterestLevelSchema = z.enum(specialInterestLevelValues);
export type SpecialInterestLevel = z.infer<typeof specialInterestLevelSchema>;

export const specialistAttendanceStatusValues = [
  "present",
  "absent",
  "substituted",
  "cancelled",
] as const;
export const specialistAttendanceStatusSchema = z.enum(
  specialistAttendanceStatusValues,
);
export type SpecialistAttendanceStatus = z.infer<
  typeof specialistAttendanceStatusSchema
>;

export const specialistPayrollTypeValues = [
  "per_session",
  "per_hour",
  "monthly_fixed",
] as const;
export const specialistPayrollTypeSchema = z.enum(specialistPayrollTypeValues);
export type SpecialistPayrollType = z.infer<typeof specialistPayrollTypeSchema>;

export const specialistPayrollStatusValues = [
  "draft",
  "approved",
  "paid",
] as const;
export const specialistPayrollStatusSchema = z.enum(
  specialistPayrollStatusValues,
);
export type SpecialistPayrollStatus = z.infer<
  typeof specialistPayrollStatusSchema
>;

export const portfolioSummaryStatusValues = [
  "draft",
  "staff_review",
  "approved",
  "hidden",
] as const;
export const portfolioSummaryStatusSchema = z.enum(portfolioSummaryStatusValues);
export type PortfolioSummaryStatus = z.infer<typeof portfolioSummaryStatusSchema>;

export const specialMediaVisibilityValues = [
  "staff_only",
  "session_children",
  "tagged_children",
] as const;
export const specialMediaVisibilitySchema = z.enum(specialMediaVisibilityValues);
export type SpecialMediaVisibility = z.infer<typeof specialMediaVisibilitySchema>;

export const specialClassMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM.");
export const specialClassTimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be HH:mm.");
export const specialSkillKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const specialSubjectSchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  status: specialSubjectStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type SpecialSubject = z.infer<typeof specialSubjectSchema>;
export const specialSubjectListSchema = z.array(specialSubjectSchema);

export const specialistTeacherSchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  fullName: z.string(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  status: specialSubjectStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type SpecialistTeacher = z.infer<typeof specialistTeacherSchema>;
export const specialistTeacherListSchema = z.array(specialistTeacherSchema);

export const specialSubjectRubricSchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  subjectId: uuidSchema,
  ageGroup: z.string(),
  skillKey: specialSkillKeySchema,
  skillLabel: z.string(),
  description: z.string().nullable(),
  displayOrder: z.number().int(),
  status: specialSubjectStatusSchema,
});
export type SpecialSubjectRubric = z.infer<typeof specialSubjectRubricSchema>;
export const specialSubjectRubricListSchema = z.array(specialSubjectRubricSchema);

export const specialClassScheduleSchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  classId: uuidSchema,
  className: z.string(),
  subjectId: uuidSchema,
  subjectName: z.string(),
  specialistTeacherId: uuidSchema.nullable(),
  specialistTeacherName: z.string().nullable(),
  weekday: z.number().int().min(1).max(7),
  startTime: specialClassTimeSchema,
  endTime: specialClassTimeSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema.nullable(),
  status: specialScheduleStatusSchema,
  payrollType: specialistPayrollTypeSchema,
  payrollAmount: z.number().int().min(0),
});
export type SpecialClassSchedule = z.infer<typeof specialClassScheduleSchema>;
export const specialClassScheduleListSchema = z.array(specialClassScheduleSchema);

export const specialClassMediaSchema = z.object({
  id: uuidSchema,
  sessionId: uuidSchema,
  mediaAssetId: uuidSchema,
  visibility: specialMediaVisibilitySchema,
  childIds: z.array(uuidSchema),
  mediaType: z.string(),
  mimeType: z.string().nullable(),
  createdAt: isoDateTimeSchema,
});
export type SpecialClassMedia = z.infer<typeof specialClassMediaSchema>;

export const specialClassChildObservationSchema = z.object({
  id: uuidSchema,
  sessionId: uuidSchema,
  childId: uuidSchema,
  childName: z.string(),
  participation: specialParticipationSchema,
  progressLevel: specialProgressLevelSchema,
  interestLevel: specialInterestLevelSchema,
  strongSkillKeys: z.array(specialSkillKeySchema),
  needsPracticeSkillKeys: z.array(specialSkillKeySchema),
  teacherNote: z.string().nullable(),
  homePractice: z.string().nullable(),
  visibleToParent: z.boolean(),
  updatedAt: isoDateTimeSchema,
});
export type SpecialClassChildObservation = z.infer<
  typeof specialClassChildObservationSchema
>;
export const specialClassObservationListSchema = z.array(
  specialClassChildObservationSchema,
);

export const specialClassSessionSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  classId: uuidSchema,
  className: z.string(),
  subjectId: uuidSchema,
  subjectName: z.string(),
  specialistTeacherId: uuidSchema.nullable(),
  specialistTeacherName: z.string().nullable(),
  sessionDate: isoDateSchema,
  title: z.string(),
  classSummary: z.string().nullable(),
  status: specialSessionStatusSchema,
  specialistAttendanceStatus: specialistAttendanceStatusSchema,
  payrollStatus: specialistPayrollStatusSchema,
  payrollAmount: z.number().int().min(0),
  publishedAt: isoDateTimeSchema.nullable(),
  observationCount: z.number().int().min(0),
  mediaCount: z.number().int().min(0),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type SpecialClassSessionSummary = z.infer<
  typeof specialClassSessionSummarySchema
>;
export const specialClassSessionListSchema = z.array(
  specialClassSessionSummarySchema,
);

export const specialClassSessionDetailSchema =
  specialClassSessionSummarySchema.extend({
    observations: specialClassObservationListSchema,
    media: z.array(specialClassMediaSchema),
  });
export type SpecialClassSessionDetail = z.infer<
  typeof specialClassSessionDetailSchema
>;

export const specialClassCommentSchema = z.object({
  id: uuidSchema,
  sessionId: uuidSchema,
  childId: uuidSchema,
  authorUserId: uuidSchema,
  authorName: z.string(),
  body: z.string(),
  createdAt: isoDateTimeSchema,
});
export type SpecialClassComment = z.infer<typeof specialClassCommentSchema>;
export const specialClassCommentListSchema = z.array(specialClassCommentSchema);

export const parentSpecialClassFeedItemSchema = z.object({
  session: specialClassSessionSummarySchema,
  observation: specialClassChildObservationSchema.nullable(),
  media: z.array(specialClassMediaSchema),
  commentsCount: z.number().int().min(0),
});
export type ParentSpecialClassFeedItem = z.infer<
  typeof parentSpecialClassFeedItemSchema
>;
export const parentSpecialClassFeedSchema = z.array(
  parentSpecialClassFeedItemSchema,
);

export const monthlySubjectProgressSchema = z.object({
  subjectId: uuidSchema,
  subjectName: z.string(),
  sessions: z.number().int().min(0),
  attended: z.number().int().min(0),
  highInterestCount: z.number().int().min(0),
  strongCount: z.number().int().min(0),
  improvingCount: z.number().int().min(0),
  needsSupportCount: z.number().int().min(0),
  topStrengths: z.array(z.string()),
  needsPractice: z.array(z.string()),
});
export type MonthlySubjectProgress = z.infer<
  typeof monthlySubjectProgressSchema
>;
export const monthlySubjectProgressListSchema = z.array(
  monthlySubjectProgressSchema,
);

export const monthlyDevelopmentSummarySchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  childId: uuidSchema,
  childName: z.string(),
  month: specialClassMonthSchema,
  status: portfolioSummaryStatusSchema,
  structuredSummary: monthlySubjectProgressListSchema,
  aiSummaryText: z.string().nullable(),
  staffEditedSummaryText: z.string().nullable(),
  approvedSummaryText: z.string().nullable(),
  aiProvider: z.string().nullable(),
  aiModel: z.string().nullable(),
  generatedAt: isoDateTimeSchema.nullable(),
  approvedAt: isoDateTimeSchema.nullable(),
});
export type MonthlyDevelopmentSummary = z.infer<
  typeof monthlyDevelopmentSummarySchema
>;

export const portfolioExportSchema = z.object({
  id: uuidSchema,
  centerId: uuidSchema,
  childId: uuidSchema,
  month: specialClassMonthSchema.nullable(),
  termLabel: z.string().nullable(),
  mediaAssetId: uuidSchema.nullable(),
  status: z.enum(["pending", "ready", "failed"]),
  generatedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});
export type PortfolioExport = z.infer<typeof portfolioExportSchema>;

export const payrollReportItemSchema = z.object({
  specialistTeacherId: uuidSchema.nullable(),
  specialistTeacherName: z.string(),
  subjectName: z.string(),
  completedSessions: z.number().int().min(0),
  cancelledSessions: z.number().int().min(0),
  totalAmount: z.number().int().min(0),
  approvedAmount: z.number().int().min(0),
  paidAmount: z.number().int().min(0),
});
export type PayrollReportItem = z.infer<typeof payrollReportItemSchema>;
export const payrollReportSchema = z.array(payrollReportItemSchema);

export const specialCenterInputSchema = z.object({ centerId: uuidSchema });
export const specialSubjectIdInputSchema = z.object({ subjectId: uuidSchema });
export const specialSpecialistIdInputSchema = z.object({
  specialistTeacherId: uuidSchema,
});
export const specialScheduleIdInputSchema = z.object({ scheduleId: uuidSchema });
export const specialSessionIdInputSchema = z.object({ sessionId: uuidSchema });
export const specialChildIdInputSchema = z.object({ childId: uuidSchema });

export const createSpecialSubjectInputSchema = z.object({
  centerId: uuidSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  color: z.string().trim().max(40).optional(),
  icon: z.string().trim().max(40).optional(),
});
export type CreateSpecialSubjectInput = z.infer<
  typeof createSpecialSubjectInputSchema
>;

export const updateSpecialSubjectInputSchema = z.object({
  subjectId: uuidSchema,
  body: createSpecialSubjectInputSchema
    .omit({ centerId: true })
    .partial()
    .extend({ status: specialSubjectStatusSchema.optional() }),
});
export type UpdateSpecialSubjectInput = z.infer<
  typeof updateSpecialSubjectInputSchema
>;

export const createSpecialistTeacherInputSchema = z.object({
  centerId: uuidSchema,
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateSpecialistTeacherInput = z.infer<
  typeof createSpecialistTeacherInputSchema
>;

export const updateSpecialistTeacherInputSchema = z.object({
  specialistTeacherId: uuidSchema,
  body: createSpecialistTeacherInputSchema
    .omit({ centerId: true })
    .partial()
    .extend({ status: specialSubjectStatusSchema.optional() }),
});
export type UpdateSpecialistTeacherInput = z.infer<
  typeof updateSpecialistTeacherInputSchema
>;

export const upsertSpecialRubricInputSchema = z.object({
  centerId: uuidSchema,
  subjectId: uuidSchema,
  ageGroup: z.string().trim().min(1).max(40),
  skills: z
    .array(
      z.object({
        skillKey: specialSkillKeySchema,
        skillLabel: z.string().trim().min(1).max(120),
        description: z.string().trim().max(500).optional(),
        displayOrder: z.number().int().min(0).optional(),
      }),
    )
    .min(1)
    .max(40),
});
export type UpsertSpecialRubricInput = z.infer<
  typeof upsertSpecialRubricInputSchema
>;

export const specialRubricsInputSchema = z.object({
  centerId: uuidSchema,
  subjectId: uuidSchema.optional(),
  ageGroup: z.string().optional(),
});

export const createSpecialScheduleInputSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema,
  subjectId: uuidSchema,
  specialistTeacherId: uuidSchema.optional(),
  weekday: z.number().int().min(1).max(7),
  startTime: specialClassTimeSchema,
  endTime: specialClassTimeSchema,
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  payrollType: specialistPayrollTypeSchema.default("per_session"),
  payrollAmount: z.number().int().min(0).default(0),
});
export type CreateSpecialScheduleInput = z.infer<
  typeof createSpecialScheduleInputSchema
>;

export const updateSpecialScheduleInputSchema = z.object({
  scheduleId: uuidSchema,
  body: createSpecialScheduleInputSchema
    .omit({ centerId: true })
    .partial()
    .extend({ status: specialScheduleStatusSchema.optional() }),
});
export type UpdateSpecialScheduleInput = z.infer<
  typeof updateSpecialScheduleInputSchema
>;

export const specialSchedulesInputSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema.optional(),
  status: specialScheduleStatusSchema.optional(),
});

export const specialStaffSessionsInputSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  status: specialSessionStatusSchema.optional(),
});

export const createSpecialSessionInputSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema,
  subjectId: uuidSchema,
  scheduleId: uuidSchema.optional(),
  specialistTeacherId: uuidSchema.optional(),
  sessionDate: isoDateSchema,
  title: z.string().trim().min(1).max(160),
  classSummary: z.string().trim().max(5000).optional(),
  specialistAttendanceStatus: specialistAttendanceStatusSchema.default("present"),
  payrollAmount: z.number().int().min(0).default(0),
});
export type CreateSpecialSessionInput = z.infer<
  typeof createSpecialSessionInputSchema
>;

export const updateSpecialSessionInputSchema = z.object({
  sessionId: uuidSchema,
  body: createSpecialSessionInputSchema
    .omit({ centerId: true })
    .partial()
    .extend({
      status: specialSessionStatusSchema.optional(),
      payrollStatus: specialistPayrollStatusSchema.optional(),
    }),
});
export type UpdateSpecialSessionInput = z.infer<
  typeof updateSpecialSessionInputSchema
>;

export const upsertSpecialObservationInputSchema = z.object({
  sessionId: uuidSchema,
  observations: z
    .array(
      z.object({
        childId: uuidSchema,
        participation: specialParticipationSchema,
        progressLevel: specialProgressLevelSchema,
        interestLevel: specialInterestLevelSchema,
        strongSkillKeys: z.array(specialSkillKeySchema).max(20).default([]),
        needsPracticeSkillKeys: z.array(specialSkillKeySchema).max(20).default([]),
        teacherNote: z.string().trim().max(2000).optional(),
        homePractice: z.string().trim().max(2000).optional(),
        visibleToParent: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(80),
});
export type UpsertSpecialObservationInput = z.infer<
  typeof upsertSpecialObservationInputSchema
>;

export const attachSpecialMediaInputSchema = z.object({
  sessionId: uuidSchema,
  mediaAssetIds: z.array(uuidSchema).min(1).max(12),
  visibility: specialMediaVisibilitySchema.default("session_children"),
  childIds: z.array(uuidSchema).max(80).optional(),
  fieldNote: z.string().trim().max(500).optional(),
});
export type AttachSpecialMediaInput = z.infer<
  typeof attachSpecialMediaInputSchema
>;

export const parentSpecialFeedInputSchema = z.object({
  childId: uuidSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const specialCommentsInputSchema = z.object({
  sessionId: uuidSchema,
  childId: uuidSchema,
});

export const addSpecialCommentInputSchema = specialCommentsInputSchema.extend({
  body: z.string().trim().min(1).max(2000),
});
export type AddSpecialCommentInput = z.infer<typeof addSpecialCommentInputSchema>;

export const monthlyProgressInputSchema = z.object({
  childId: uuidSchema,
  month: specialClassMonthSchema,
});
export type MonthlyProgressInput = z.infer<typeof monthlyProgressInputSchema>;

export const generateAiSummaryInputSchema = monthlyProgressInputSchema.extend({
  language: z.enum(["uz", "ru", "en"]).default("uz"),
});
export type GenerateAiSummaryInput = z.infer<
  typeof generateAiSummaryInputSchema
>;

export const updateDevelopmentSummaryInputSchema = z.object({
  summaryId: uuidSchema,
  body: z.object({
    staffEditedSummaryText: z.string().trim().min(1).max(4000),
  }),
});
export type UpdateDevelopmentSummaryInput = z.infer<
  typeof updateDevelopmentSummaryInputSchema
>;

export const summaryIdInputSchema = z.object({ summaryId: uuidSchema });

export const createPortfolioExportInputSchema = monthlyProgressInputSchema.extend({
  termLabel: z.string().trim().max(120).optional(),
});
export type CreatePortfolioExportInput = z.infer<
  typeof createPortfolioExportInputSchema
>;

export const portfolioExportIdInputSchema = z.object({ exportId: uuidSchema });

export const payrollReportInputSchema = z.object({
  centerId: uuidSchema,
  month: specialClassMonthSchema,
});
export type PayrollReportInput = z.infer<typeof payrollReportInputSchema>;

export const updateSessionPayrollInputSchema = z.object({
  sessionId: uuidSchema,
  payrollStatus: specialistPayrollStatusSchema,
  payrollAmount: z.number().int().min(0).optional(),
});
export type UpdateSessionPayrollInput = z.infer<
  typeof updateSessionPayrollInputSchema
>;

