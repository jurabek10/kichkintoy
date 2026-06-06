import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";
import {
  completeMedicationRequestInputSchema,
  createMedicationRequestInputSchema,
  medicationAudienceResponseSchema,
  medicationListResponseSchema,
  medicationRequestDetailSchema,
  medicationStatusSchema,
} from "../medications.js";

const medicationRequestIdInputSchema = z.object({ requestId: uuidSchema });

const parentListInputSchema = z
  .object({
    childId: uuidSchema.optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: medicationStatusSchema.optional(),
  })
  .optional();

const staffListInputSchema = z.object({
  centerId: uuidSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: medicationStatusSchema.optional(),
});

const medicationChildrenInputSchema = z
  .object({
    centerId: uuidSchema.optional(),
  })
  .optional();

const completeMedicationInputSchema = medicationRequestIdInputSchema.extend({
  body: completeMedicationRequestInputSchema,
});

const latestMedicationInputSchema = z.object({
  childId: uuidSchema,
});

export const medicationsContract = {
  children: oc
    .input(medicationChildrenInputSchema)
    .output(medicationAudienceResponseSchema),
  parentList: oc.input(parentListInputSchema).output(medicationListResponseSchema),
  staffList: oc.input(staffListInputSchema).output(medicationListResponseSchema),
  detail: oc
    .input(medicationRequestIdInputSchema)
    .output(medicationRequestDetailSchema),
  create: oc
    .input(createMedicationRequestInputSchema)
    .output(medicationRequestDetailSchema),
  cancel: oc
    .input(medicationRequestIdInputSchema)
    .output(medicationRequestDetailSchema),
  complete: oc
    .input(completeMedicationInputSchema)
    .output(medicationRequestDetailSchema),
  latestForChild: oc
    .input(latestMedicationInputSchema)
    .output(medicationRequestDetailSchema.nullable()),
};
