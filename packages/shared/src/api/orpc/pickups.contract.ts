import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";
import {
  createPickupNoticeInputSchema,
  pickupAudienceResponseSchema,
  pickupNoticeDetailSchema,
  pickupNoticeListResponseSchema,
  pickupNoticeStatusSchema,
  updatePickupNoticeBodySchema,
} from "../pickups.js";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const pickupNoticeIdInputSchema = z.object({ noticeId: uuidSchema });

const pickupChildrenInputSchema = z
  .object({
    centerId: uuidSchema.optional(),
  })
  .optional();

const parentPickupListInputSchema = z
  .object({
    childId: uuidSchema.optional(),
    date: isoDateSchema.optional(),
    status: pickupNoticeStatusSchema.optional(),
  })
  .optional();

const staffPickupListInputSchema = z.object({
  centerId: uuidSchema,
  date: isoDateSchema.optional(),
  status: pickupNoticeStatusSchema.optional(),
  classId: uuidSchema.optional(),
});

const updatePickupNoticeInputSchema = pickupNoticeIdInputSchema.extend({
  body: updatePickupNoticeBodySchema,
});

export const pickupsContract = {
  children: oc
    .input(pickupChildrenInputSchema)
    .output(pickupAudienceResponseSchema),
  parentList: oc
    .input(parentPickupListInputSchema)
    .output(pickupNoticeListResponseSchema),
  staffList: oc
    .input(staffPickupListInputSchema)
    .output(pickupNoticeListResponseSchema),
  detail: oc.input(pickupNoticeIdInputSchema).output(pickupNoticeDetailSchema),
  create: oc
    .input(createPickupNoticeInputSchema)
    .output(pickupNoticeDetailSchema),
  update: oc
    .input(updatePickupNoticeInputSchema)
    .output(pickupNoticeDetailSchema),
  cancel: oc.input(pickupNoticeIdInputSchema).output(pickupNoticeDetailSchema),
  acknowledge: oc
    .input(pickupNoticeIdInputSchema)
    .output(pickupNoticeDetailSchema),
};
