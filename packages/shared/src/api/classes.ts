import { z } from "zod";
import { childGenderSchema } from "../child/gender.js";
import { isoDateSchema, uuidSchema } from "../lib/validators.js";

// --- Enums ---

export const classStatusValues = ["active", "archived"] as const;
export const classStatusSchema = z.enum(classStatusValues);
export type ClassStatus = z.infer<typeof classStatusSchema>;

export const assignmentRoleValues = ["teacher", "assistant_teacher"] as const;
export const assignmentRoleSchema = z.enum(assignmentRoleValues);
export type AssignmentRole = z.infer<typeof assignmentRoleSchema>;

// --- Class summaries ---

export const classTeacherChipSchema = z.object({
  userId: uuidSchema,
  fullName: z.string(),
  assignmentRole: assignmentRoleSchema,
});
export type ClassTeacherChip = z.infer<typeof classTeacherChipSchema>;

export const classListItemSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  ageGroup: z.string().nullable(),
  academicYear: z.string().nullable(),
  status: classStatusSchema,
  childCount: z.number().int(),
  teacherCount: z.number().int(),
  teachers: z.array(classTeacherChipSchema),
});
export type ClassListItem = z.infer<typeof classListItemSchema>;

export const classRosterChildSchema = z.object({
  childId: uuidSchema,
  name: z.string(),
  photoUrl: z.string().nullable(),
  dateOfBirth: isoDateSchema.nullable(),
  gender: childGenderSchema.nullable(),
});
export type ClassRosterChild = z.infer<typeof classRosterChildSchema>;

export const classDetailSchema = classListItemSchema.extend({
  children: z.array(classRosterChildSchema),
});
export type ClassDetail = z.infer<typeof classDetailSchema>;

export const classListResponseSchema = z.array(classListItemSchema);
export type ClassListResponse = z.infer<typeof classListResponseSchema>;

// --- Class mutations ---

export const createClassRequestSchema = z.object({
  name: z.string().trim().min(1).max(60),
  ageGroup: z.string().trim().max(60).optional(),
  academicYear: z.string().trim().max(20).optional(),
});
export type CreateClassRequest = z.infer<typeof createClassRequestSchema>;

export const updateClassRequestSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  ageGroup: z.string().trim().max(60).nullable().optional(),
  academicYear: z.string().trim().max(20).nullable().optional(),
});
export type UpdateClassRequest = z.infer<typeof updateClassRequestSchema>;

// --- Teachers ---

export const centerTeacherAssignmentSchema = z.object({
  classId: uuidSchema,
  className: z.string(),
  assignmentRole: assignmentRoleSchema,
});
export type CenterTeacherAssignment = z.infer<
  typeof centerTeacherAssignmentSchema
>;

export const centerTeacherSchema = z.object({
  userId: uuidSchema,
  fullName: z.string(),
  phoneNumber: z.string().nullable(),
  username: z.string().nullable(),
  canApproveMembers: z.boolean(),
  assignments: z.array(centerTeacherAssignmentSchema),
});
export type CenterTeacher = z.infer<typeof centerTeacherSchema>;

export const centerTeachersResponseSchema = z.array(centerTeacherSchema);
export type CenterTeachersResponse = z.infer<
  typeof centerTeachersResponseSchema
>;

export const assignTeacherRequestSchema = z.object({
  teacherUserId: uuidSchema,
  assignmentRole: assignmentRoleSchema.default("teacher"),
});
export type AssignTeacherRequest = z.infer<typeof assignTeacherRequestSchema>;

export const updateTeacherPermissionsRequestSchema = z.object({
  canApproveMembers: z.boolean(),
});
export type UpdateTeacherPermissionsRequest = z.infer<
  typeof updateTeacherPermissionsRequestSchema
>;

// --- Teacher workspace (read-only) ---

export const teacherClassSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  ageGroup: z.string().nullable(),
  academicYear: z.string().nullable(),
  assignmentRole: assignmentRoleSchema,
  childCount: z.number().int(),
});
export type TeacherClass = z.infer<typeof teacherClassSchema>;

export const teacherClassesResponseSchema = z.array(teacherClassSchema);
export type TeacherClassesResponse = z.infer<
  typeof teacherClassesResponseSchema
>;

export const teacherRosterResponseSchema = z.array(classRosterChildSchema);
export type TeacherRosterResponse = z.infer<typeof teacherRosterResponseSchema>;
