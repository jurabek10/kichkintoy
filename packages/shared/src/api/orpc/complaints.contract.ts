import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";
import {
  complaintCategorySchema,
  complaintDetailSchema,
  complaintListResponseSchema,
  complaintOpenCountSchema,
  complaintReplyInputSchema,
  complaintSetStatusInputSchema,
  complaintStatusSchema,
  createComplaintInputSchema,
} from "../complaints.js";

const pageSchema = { cursor: uuidSchema.optional(), limit: z.number().int().min(1).max(50).default(10) };

export const complaintsContract = {
  create: oc.input(createComplaintInputSchema).output(complaintDetailSchema),
  parentList: oc.input(z.object({ childId: uuidSchema.optional(), status: complaintStatusSchema.optional(), ...pageSchema }).optional()).output(complaintListResponseSchema),
  staffList: oc.input(z.object({ centerId: uuidSchema, status: complaintStatusSchema.optional(), category: complaintCategorySchema.optional(), classId: uuidSchema.optional(), from: z.string().datetime().optional(), ...pageSchema })).output(complaintListResponseSchema),
  detail: oc.input(z.object({ complaintId: uuidSchema })).output(complaintDetailSchema),
  reply: oc.input(complaintReplyInputSchema).output(complaintDetailSchema),
  setStatus: oc.input(complaintSetStatusInputSchema).output(complaintDetailSchema),
  withdraw: oc.input(z.object({ complaintId: uuidSchema })).output(complaintDetailSchema),
  openCount: oc.input(z.object({ centerId: uuidSchema })).output(complaintOpenCountSchema),
};
