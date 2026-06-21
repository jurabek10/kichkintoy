import { z } from "zod";
import { isoDateSchema, isoDateTimeSchema, uuidSchema } from "../lib/validators.js";

export const attendanceStatusValues = [
  "not_checked_in",
  "present",
  "absent",
  "late",
  "left_early",
  "picked_up",
  "excused",
] as const;
export const attendanceStatusSchema = z.enum(attendanceStatusValues);
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;

export const attendanceChildSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  centerId: uuidSchema,
  centerName: z.string(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
});
export type AttendanceChild = z.infer<typeof attendanceChildSchema>;

export const attendanceStaffSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
});
export type AttendanceStaff = z.infer<typeof attendanceStaffSchema>;

export const attendanceRecordSummarySchema = z.object({
  id: uuidSchema.nullable(),
  centerId: uuidSchema,
  centerName: z.string(),
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
  child: attendanceChildSchema,
  attendanceDate: isoDateSchema,
  status: attendanceStatusSchema,
  checkedInAt: isoDateTimeSchema.nullable(),
  checkedOutAt: isoDateTimeSchema.nullable(),
  absenceReason: z.string().nullable(),
  pickedUpBy: z.string().nullable(),
  pickedUpRelationship: z.string().nullable(),
  staffNote: z.string().nullable(),
  parentVisibleNote: z.string().nullable(),
  recordedBy: attendanceStaffSchema.nullable(),
  updatedBy: attendanceStaffSchema.nullable(),
  createdAt: isoDateTimeSchema.nullable(),
  updatedAt: isoDateTimeSchema.nullable(),
});
export type AttendanceRecordSummary = z.infer<
  typeof attendanceRecordSummarySchema
>;

export const attendanceSummarySchema = z.object({
  total: z.number().int().min(0),
  notCheckedIn: z.number().int().min(0),
  present: z.number().int().min(0),
  late: z.number().int().min(0),
  absent: z.number().int().min(0),
  excused: z.number().int().min(0),
  leftEarly: z.number().int().min(0),
  pickedUp: z.number().int().min(0),
});
export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>;

export const attendanceChildrenResponseSchema = z.object({
  children: z.array(attendanceChildSchema),
});
export type AttendanceChildrenResponse = z.infer<
  typeof attendanceChildrenResponseSchema
>;

export const staffAttendanceListResponseSchema = z.object({
  summary: attendanceSummarySchema,
  records: z.array(attendanceRecordSummarySchema),
});
export type StaffAttendanceListResponse = z.infer<
  typeof staffAttendanceListResponseSchema
>;

export const parentAttendanceListResponseSchema = z.array(
  attendanceRecordSummarySchema,
);
export type ParentAttendanceListResponse = z.infer<
  typeof parentAttendanceListResponseSchema
>;

export const attendanceDetailSchema = attendanceRecordSummarySchema;
export type AttendanceDetail = z.infer<typeof attendanceDetailSchema>;

export const recordAttendanceCheckInInputSchema = z.object({
  childId: uuidSchema,
  attendanceDate: isoDateSchema,
  checkedInAt: isoDateTimeSchema.optional(),
  late: z.boolean().optional(),
  staffNote: z.string().trim().max(500).optional(),
  parentVisibleNote: z.string().trim().max(500).optional(),
});
export type RecordAttendanceCheckInInput = z.infer<
  typeof recordAttendanceCheckInInputSchema
>;

export const recordAttendanceCheckOutInputSchema = z.object({
  childId: uuidSchema,
  attendanceDate: isoDateSchema,
  checkedOutAt: isoDateTimeSchema.optional(),
  leftEarly: z.boolean().optional(),
  pickedUpBy: z.string().trim().max(200).optional(),
  pickedUpRelationship: z.string().trim().max(100).optional(),
  staffNote: z.string().trim().max(500).optional(),
  parentVisibleNote: z.string().trim().max(500).optional(),
});
export type RecordAttendanceCheckOutInput = z.infer<
  typeof recordAttendanceCheckOutInputSchema
>;

export const markAttendanceStatusValues = [
  "absent",
  "excused",
  "late",
  "present",
  "left_early",
  "picked_up",
] as const;
export const markAttendanceStatusSchema = z.enum(markAttendanceStatusValues);

export const markAttendanceStatusInputSchema = z.object({
  childId: uuidSchema,
  attendanceDate: isoDateSchema,
  status: markAttendanceStatusSchema,
  absenceReason: z.string().trim().max(300).optional(),
  staffNote: z.string().trim().max(500).optional(),
  parentVisibleNote: z.string().trim().max(500).optional(),
});
export type MarkAttendanceStatusInput = z.infer<
  typeof markAttendanceStatusInputSchema
>;

export const parentSubmitAttendanceAbsenceInputSchema = z.object({
  childId: uuidSchema,
  attendanceDate: isoDateSchema,
  absenceReason: z.string().trim().min(1).max(300),
  parentVisibleNote: z.string().trim().max(500).optional(),
});
export type ParentSubmitAttendanceAbsenceInput = z.infer<
  typeof parentSubmitAttendanceAbsenceInputSchema
>;
