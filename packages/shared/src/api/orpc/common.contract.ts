import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";

export const emptyInputSchema = z.object({}).optional();
export const successResponseSchema = z.object({ success: z.boolean() });
export const idInputSchema = z.object({ id: uuidSchema });
export const centerIdInputSchema = z.object({ centerId: uuidSchema });
export const centerClassInputSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema,
});
export const reportIdInputSchema = z.object({ reportId: uuidSchema });
