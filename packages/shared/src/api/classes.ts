import { z } from "zod";
import { childGenderSchema } from "../child/gender.js";
import {
  isoDateSchema,
  isoDateTimeSchema,
  phoneNumberSchema,
  uuidSchema,
} from "../lib/validators.js";

// --- Enums ---

export const classStatusValues = ["active", "archived"] as const;
export const classStatusSchema = z.enum(classStatusValues);
export type ClassStatus = z.infer<typeof classStatusSchema>;

export const assignmentRoleValues = ["teacher", "assistant_teacher"] as const;
export const assignmentRoleSchema = z.enum(assignmentRoleValues);
export type AssignmentRole = z.infer<typeof assignmentRoleSchema>;

export const classCapacityValues = [5, 10, 15, 20, 25, 30, 35] as const;
export const classCapacitySchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(20),
  z.literal(25),
  z.literal(30),
  z.literal(35),
]);
export type ClassCapacity = z.infer<typeof classCapacitySchema>;

// --- Class summaries ---

export const classTeacherChipSchema = z.object({
  userId: uuidSchema,
  fullName: z.string(),
  // A media-asset id or legacy URL for the teacher's photo (resolved client-side).
  avatarUrl: z.string().nullable(),
  assignmentRole: assignmentRoleSchema,
});
export type ClassTeacherChip = z.infer<typeof classTeacherChipSchema>;

export const classListItemSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  ageGroup: z.string().nullable(),
  academicYear: z.string().nullable(),
  maxChildren: classCapacitySchema.nullable(),
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
  joinedAt: isoDateSchema.nullable(),
  gender: childGenderSchema.nullable(),
  // The guardian who registered the child first (mom/dad/other) and their
  // contact details from signup. Only the director roster populates these;
  // teacher-facing rosters omit them.
  guardianPhone: z.string().nullable().optional(),
  guardianName: z.string().nullable().optional(),
  guardianRelation: z.string().nullable().optional(),
});
export type ClassRosterChild = z.infer<typeof classRosterChildSchema>;

export const classDetailSchema = classListItemSchema.extend({
  children: z.array(classRosterChildSchema),
});
export type ClassDetail = z.infer<typeof classDetailSchema>;

export const classListResponseSchema = z.array(classListItemSchema);
export type ClassListResponse = z.infer<typeof classListResponseSchema>;

// --- Child detail (director) ---

export const childGuardianContactSchema = z.object({
  userId: uuidSchema,
  fullName: z.string(),
  phone: z.string().nullable(),
  relationship: z.string().nullable(),
  isPrimary: z.boolean(),
});
export type ChildGuardianContact = z.infer<typeof childGuardianContactSchema>;

export const childEnrollmentRefSchema = z.object({
  classId: uuidSchema.nullable(),
  className: z.string().nullable(),
  status: z.string(),
  startedAt: isoDateSchema.nullable(),
});
export type ChildEnrollmentRef = z.infer<typeof childEnrollmentRefSchema>;

export const childDetailSchema = z.object({
  id: uuidSchema,
  firstName: z.string(),
  lastName: z.string().nullable(),
  name: z.string(),
  dateOfBirth: isoDateSchema.nullable(),
  gender: childGenderSchema.nullable(),
  photoUrl: z.string().nullable(),
  status: z.string(),
  allergies: z.string().nullable(),
  medicalNotes: z.string().nullable(),
  enrollment: childEnrollmentRefSchema.nullable(),
  guardians: z.array(childGuardianContactSchema),
});
export type ChildDetail = z.infer<typeof childDetailSchema>;

export const updateChildRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).nullable(),
  dateOfBirth: isoDateSchema,
  gender: childGenderSchema.nullable(),
  allergies: z.string().trim().max(500).nullable(),
  medicalNotes: z.string().trim().max(2000).nullable(),
});
export type UpdateChildRequest = z.infer<typeof updateChildRequestSchema>;

// --- Class mutations ---

export const createClassRequestSchema = z.object({
  name: z.string().trim().min(1).max(60),
  ageGroup: z.string().trim().max(60).optional(),
  academicYear: z.string().trim().max(20).optional(),
  maxChildren: classCapacitySchema,
});
export type CreateClassRequest = z.infer<typeof createClassRequestSchema>;

export const updateClassRequestSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  ageGroup: z.string().trim().max(60).nullable().optional(),
  academicYear: z.string().trim().max(20).nullable().optional(),
  maxChildren: classCapacitySchema.nullable().optional(),
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
  avatarUrl: z.string().nullable(),
  status: z.string(),
  canApproveMembers: z.boolean(),
  // joinedAt = when the teacher's account was created (joined the platform).
  // approvedAt = when they were granted the teacher role at this center.
  joinedAt: isoDateTimeSchema.nullable(),
  approvedAt: isoDateTimeSchema.nullable(),
  assignments: z.array(centerTeacherAssignmentSchema),
});
export type CenterTeacher = z.infer<typeof centerTeacherSchema>;

export const centerTeachersResponseSchema = z.array(centerTeacherSchema);
export type CenterTeachersResponse = z.infer<
  typeof centerTeachersResponseSchema
>;

export const teacherDetailSchema = centerTeacherSchema.extend({
  email: z.string().nullable(),
  lastLoginAt: isoDateTimeSchema.nullable(),
});
export type TeacherDetail = z.infer<typeof teacherDetailSchema>;

export const updateTeacherProfileRequestSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phoneNumber: phoneNumberSchema.nullable(),
  canApproveMembers: z.boolean(),
});
export type UpdateTeacherProfileRequest = z.infer<
  typeof updateTeacherProfileRequestSchema
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
  maxChildren: classCapacitySchema.nullable(),
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
