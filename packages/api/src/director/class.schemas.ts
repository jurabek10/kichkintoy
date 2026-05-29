import { z } from "zod";

const assignmentRoleSchema = z.enum(["teacher", "assistant_teacher"]);
const uuidSchema = z.string().trim().uuid();

export const createClassSchema = z.object({
  name: z.string().trim().min(1, "Class name is required.").max(60),
  ageGroup: z.string().trim().max(60).optional(),
  academicYear: z.string().trim().max(20).optional(),
});

export const updateClassSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  ageGroup: z.string().trim().max(60).nullable().optional(),
  academicYear: z.string().trim().max(20).nullable().optional(),
});

export const assignTeacherSchema = z.object({
  teacherUserId: uuidSchema,
  assignmentRole: assignmentRoleSchema.default("teacher"),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;
