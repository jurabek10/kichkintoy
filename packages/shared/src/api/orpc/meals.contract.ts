import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";
import {
  createMealPostInputSchema,
  mealAudienceResponseSchema,
  mealListResponseSchema,
  mealPostDetailSchema,
  mealStatusSchema,
  mealTypeSchema,
  setMealChildStatusesBodySchema,
  updateMealPostBodySchema,
} from "../meals.js";
import { centerIdInputSchema, successResponseSchema } from "./common.contract.js";

const mealIdInputSchema = z.object({ mealId: uuidSchema });

const staffListInputSchema = z.object({
  centerId: uuidSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: mealStatusSchema.optional(),
  mealType: mealTypeSchema.optional(),
});

const parentListInputSchema = z
  .object({
    childId: uuidSchema.optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .optional();

const updateMealInputSchema = mealIdInputSchema.extend({
  body: updateMealPostBodySchema,
});

const setMealChildStatusesInputSchema = mealIdInputSchema.extend({
  body: setMealChildStatusesBodySchema,
});

export const mealsContract = {
  audience: oc.input(centerIdInputSchema).output(mealAudienceResponseSchema),
  staffList: oc.input(staffListInputSchema).output(mealListResponseSchema),
  parentList: oc.input(parentListInputSchema).output(mealListResponseSchema),
  detail: oc.input(mealIdInputSchema).output(mealPostDetailSchema),
  create: oc.input(createMealPostInputSchema).output(mealPostDetailSchema),
  update: oc.input(updateMealInputSchema).output(mealPostDetailSchema),
  publish: oc.input(mealIdInputSchema).output(mealPostDetailSchema),
  unpublish: oc.input(mealIdInputSchema).output(mealPostDetailSchema),
  delete: oc.input(mealIdInputSchema).output(successResponseSchema),
  setChildStatuses: oc
    .input(setMealChildStatusesInputSchema)
    .output(mealPostDetailSchema),
};
