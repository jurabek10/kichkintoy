import { oc } from "@orpc/contract";
import { z } from "zod";
import { uuidSchema } from "../../lib/validators.js";
import {
  bulkDailyReportRequestSchema,
  createDailyReportRequestSchema,
  dailyReportClassChildStatusSchema,
  dailyReportCommentRequestSchema,
  dailyReportCommentSchema,
  dailyReportDetailSchema,
  dailyReportListResponseSchema,
  dailyReportReadSchema,
  parentChildSummarySchema,
  publishDailyReportRequestSchema,
  updateDailyReportRequestSchema,
} from "../daily-reports.js";
import {
  emptyInputSchema,
  reportIdInputSchema,
  successResponseSchema,
} from "./common.contract.js";

const listReportsInputSchema = z.object({
  reportDate: z.string().optional(),
});

const parentReportsInputSchema = z.object({ childId: uuidSchema });

const classReportsInputSchema = z.object({
  classId: uuidSchema,
  reportDate: z.string().optional(),
});

const bulkReportsInputSchema = z.object({
  classId: uuidSchema,
  body: bulkDailyReportRequestSchema,
});

const updateReportInputSchema = z.object({
  reportId: uuidSchema,
  body: updateDailyReportRequestSchema,
});

const publishReportInputSchema = z.object({
  reportId: uuidSchema,
  body: publishDailyReportRequestSchema,
});

const reportCommentInputSchema = z.object({
  reportId: uuidSchema,
  body: dailyReportCommentRequestSchema,
});

const deleteCommentInputSchema = z.object({
  reportId: uuidSchema,
  commentId: uuidSchema,
});

const bulkDraftsResultSchema = z.object({
  created: z.number().int(),
  skipped: z.number().int(),
});

const publishDraftsResultSchema = z.object({
  published: z.number().int(),
  skipped: z.number().int(),
});

export const reportsContract = {
  teacherList: oc
    .input(listReportsInputSchema)
    .output(dailyReportListResponseSchema),
  create: oc
    .input(createDailyReportRequestSchema)
    .output(dailyReportDetailSchema),
  teacherDetail: oc.input(reportIdInputSchema).output(dailyReportDetailSchema),
  update: oc.input(updateReportInputSchema).output(dailyReportDetailSchema),
  publish: oc.input(publishReportInputSchema).output(dailyReportDetailSchema),
  unpublish: oc.input(reportIdInputSchema).output(dailyReportDetailSchema),
  delete: oc.input(reportIdInputSchema).output(successResponseSchema),
  bulkCreateDrafts: oc.input(bulkReportsInputSchema).output(bulkDraftsResultSchema),
  publishDrafts: oc
    .input(bulkReportsInputSchema)
    .output(publishDraftsResultSchema),
  classStatuses: oc
    .input(classReportsInputSchema)
    .output(z.array(dailyReportClassChildStatusSchema)),
  reads: oc.input(reportIdInputSchema).output(z.array(dailyReportReadSchema)),
  staffComment: oc
    .input(reportCommentInputSchema)
    .output(dailyReportCommentSchema),
  parentChildren: oc
    .input(emptyInputSchema)
    .output(z.array(parentChildSummarySchema)),
  parentList: oc
    .input(parentReportsInputSchema)
    .output(dailyReportListResponseSchema),
  parentDetail: oc.input(reportIdInputSchema).output(dailyReportDetailSchema),
  parentComment: oc
    .input(reportCommentInputSchema)
    .output(dailyReportCommentSchema),
  deleteComment: oc
    .input(deleteCommentInputSchema)
    .output(successResponseSchema),
};
