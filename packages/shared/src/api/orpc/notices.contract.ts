import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";
import {
  createNoticeRequestSchema,
  noticeAudienceResponseSchema,
  noticeDetailSchema,
  noticeListResponseSchema,
  noticeRecipientActionResponseSchema,
  publishNoticeRequestSchema,
  updateNoticeRequestSchema,
} from "../notices.js";
import {
  centerIdInputSchema,
  reportIdInputSchema,
  successResponseSchema,
} from "./common.contract.js";

const noticeIdInputSchema = z.object({ noticeId: uuidSchema });
const authorListInputSchema = z.object({
  centerId: uuidSchema,
  status: z.enum(["draft", "scheduled", "published"]).optional(),
});
const updateNoticeInputSchema = noticeIdInputSchema.extend({
  body: updateNoticeRequestSchema,
});
const publishNoticeInputSchema = noticeIdInputSchema.extend({
  body: publishNoticeRequestSchema,
});
const parentChildNoticesInputSchema = z.object({ childId: uuidSchema });

export const noticesContract = {
  audience: oc.input(centerIdInputSchema).output(noticeAudienceResponseSchema),
  authorList: oc.input(authorListInputSchema).output(noticeListResponseSchema),
  create: oc.input(createNoticeRequestSchema).output(noticeDetailSchema),
  authorDetail: oc.input(noticeIdInputSchema).output(noticeDetailSchema),
  update: oc.input(updateNoticeInputSchema).output(noticeDetailSchema),
  publish: oc.input(publishNoticeInputSchema).output(noticeDetailSchema),
  unpublish: oc.input(noticeIdInputSchema).output(noticeDetailSchema),
  delete: oc.input(noticeIdInputSchema).output(successResponseSchema),
  parentList: oc
    .input(z.object({}).optional())
    .output(noticeListResponseSchema),
  parentChildList: oc
    .input(parentChildNoticesInputSchema)
    .output(noticeListResponseSchema),
  parentDetail: oc.input(noticeIdInputSchema).output(noticeDetailSchema),
  confirm: oc
    .input(noticeIdInputSchema)
    .output(noticeRecipientActionResponseSchema),
};
