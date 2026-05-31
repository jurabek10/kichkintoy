import { oc } from "@orpc/contract";
import { z } from "zod";
import { authUserSchema } from "../auth/session.js";
import {
  invitationKindSchema,
  invitationStatusSchema,
  joinRequestKindSchema,
  joinRequestStatusSchema,
} from "../membership/index.js";
import {
  isoDateTimeSchema,
  phoneNumberSchema,
  uuidSchema,
} from "../lib/validators.js";
import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  authResponseSchema,
  loginRequestSchema,
  lookupInvitationsRequestSchema,
  pendingInvitationSchema,
  registerRequestSchema,
  sendCodeRequestSchema,
  sendCodeResponseSchema,
  verifyCodeRequestSchema,
  verifyCodeResponseSchema,
} from "./auth.js";
import {
  centerByCodeQuerySchema,
  centerClassesResponseSchema,
  centerSearchQuerySchema,
  centerSearchResponseSchema,
} from "./centers.js";
import { centerSearchResultSchema } from "../centers/models.js";
import {
  assignTeacherRequestSchema,
  centerTeachersResponseSchema,
  classDetailSchema,
  classListResponseSchema,
  classRosterChildSchema,
  createClassRequestSchema,
  teacherClassesResponseSchema,
  updateClassRequestSchema,
  updateTeacherPermissionsRequestSchema,
} from "./classes.js";
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
} from "./daily-reports.js";
import { districtsResponseSchema, regionsResponseSchema } from "./geo.js";
import {
  cancelJoinRequestResponseSchema,
  submitJoinRequestResponseSchema,
  submitJoinRequestSchema,
} from "./membership.js";

const emptyInputSchema = z.object({}).optional();
const successResponseSchema = z.object({ success: z.boolean() });
const idInputSchema = z.object({ id: uuidSchema });
const centerIdInputSchema = z.object({ centerId: uuidSchema });
const centerClassInputSchema = z.object({
  centerId: uuidSchema,
  classId: uuidSchema,
});
const reportIdInputSchema = z.object({ reportId: uuidSchema });

const logoutInputSchema = z.object({
  token: z.string().trim().min(1).optional(),
});

const meResponseSchema = z.object({
  user: authUserSchema
    .omit({ role: true })
    .extend({
      roles: z.array(
        z.object({
          name: z.string(),
          organizationId: uuidSchema.nullable(),
          centerId: uuidSchema.nullable(),
          branchId: uuidSchema.nullable(),
        }),
      ),
    }),
});

export const joinRequestRowSchema = z.object({
  id: uuidSchema,
  kind: joinRequestKindSchema,
  status: joinRequestStatusSchema,
  createdAt: isoDateTimeSchema,
  reviewedAt: isoDateTimeSchema.nullable(),
  reviewerMessage: z.string().nullable(),
  requester: z.object({
    id: uuidSchema,
    fullName: z.string(),
    phoneNumber: z.string().nullable(),
    username: z.string().nullable(),
  }),
  child: z
    .object({
      name: z.string(),
      dateOfBirth: z.string().nullable(),
      gender: z.string().nullable(),
      photoUrl: z.string().nullable(),
      relationship: z.string().nullable(),
      customRelationshipLabel: z.string().nullable(),
      requestedClass: z.object({ id: uuidSchema, name: z.string() }).nullable(),
    })
    .nullable(),
  message: z.string().nullable(),
  reviewedBy: z.object({ id: uuidSchema, fullName: z.string() }).nullable(),
});

export const invitationRowSchema = z.object({
  id: uuidSchema,
  kind: invitationKindSchema,
  phone: z.string(),
  childNameHint: z.string().nullable(),
  class: z.object({ id: uuidSchema, name: z.string() }).nullable(),
  expiresAt: isoDateTimeSchema,
  sentAt: isoDateTimeSchema.nullable(),
  acceptedAt: isoDateTimeSchema.nullable(),
  declinedAt: isoDateTimeSchema.nullable(),
  revokedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  status: invitationStatusSchema,
  invitedBy: z.object({ id: uuidSchema, fullName: z.string() }),
  acceptedBy: z.object({ id: uuidSchema, fullName: z.string() }).nullable(),
});

const listJoinRequestsInputSchema = z.object({
  centerId: uuidSchema,
  status: joinRequestStatusSchema.optional(),
});
const approveJoinRequestInputSchema = z.object({
  centerId: uuidSchema,
  requestId: uuidSchema,
  classId: uuidSchema.optional(),
});
const rejectJoinRequestInputSchema = z.object({
  centerId: uuidSchema,
  requestId: uuidSchema,
  reason: z.string().trim().max(500).optional(),
});
export const joinRequestActionResponseSchema = z.object({
  id: uuidSchema,
  status: joinRequestStatusSchema,
  kind: joinRequestKindSchema,
  reviewedAt: isoDateTimeSchema.nullable(),
});

const createInvitationInputSchema = z.object({
  centerId: uuidSchema,
  kind: invitationKindSchema,
  phone: phoneNumberSchema,
  classId: uuidSchema.optional(),
  childNameHint: z.string().trim().max(120).optional(),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});
const invitationIdInputSchema = z.object({
  centerId: uuidSchema,
  invitationId: uuidSchema,
});
export const createInvitationResponseSchema = z.object({
  id: uuidSchema,
  kind: invitationKindSchema,
  phone: z.string(),
  classId: uuidSchema.nullable(),
  expiresAt: isoDateTimeSchema,
  sentAt: isoDateTimeSchema.nullable(),
  smsProvider: z.string(),
  smsDelivered: z.boolean(),
});
export const resendInvitationResponseSchema = z.object({
  id: uuidSchema,
  expiresAt: isoDateTimeSchema,
  sentAt: isoDateTimeSchema.nullable(),
  smsDelivered: z.boolean(),
});
export const revokeInvitationResponseSchema = z.object({
  id: uuidSchema,
  revokedAt: z.union([isoDateTimeSchema, z.date()]).nullable(),
});

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
const assignTeacherResponseSchema = z.object({
  id: uuidSchema,
  alreadyAssigned: z.boolean(),
});
const updateTeacherResponseSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  canApproveMembers: z.boolean(),
});
const bulkDraftsResultSchema = z.object({
  created: z.number().int(),
  skipped: z.number().int(),
});
const publishDraftsResultSchema = z.object({
  published: z.number().int(),
  skipped: z.number().int(),
});

export const appContract = {
  auth: {
    sendCode: oc.input(sendCodeRequestSchema).output(sendCodeResponseSchema),
    verifyCode: oc
      .input(verifyCodeRequestSchema)
      .output(verifyCodeResponseSchema),
    register: oc.input(registerRequestSchema).output(authResponseSchema),
    login: oc.input(loginRequestSchema).output(authResponseSchema),
    logout: oc.input(logoutInputSchema).output(successResponseSchema),
    lookupInvitations: oc
      .input(lookupInvitationsRequestSchema)
      .output(z.array(pendingInvitationSchema)),
    me: oc.input(emptyInputSchema).output(meResponseSchema),
    myInvitations: oc
      .input(emptyInputSchema)
      .output(z.array(pendingInvitationSchema)),
    acceptInvitation: oc
      .input(idInputSchema.extend({ body: acceptInvitationRequestSchema }))
      .output(acceptInvitationResponseSchema),
    declineInvitation: oc.input(idInputSchema).output(successResponseSchema),
    submitJoinRequest: oc
      .input(submitJoinRequestSchema)
      .output(submitJoinRequestResponseSchema),
    cancelJoinRequest: oc
      .input(idInputSchema)
      .output(cancelJoinRequestResponseSchema),
  },
  geo: {
    regions: oc.input(emptyInputSchema).output(regionsResponseSchema),
    districts: oc
      .input(z.object({ regionId: uuidSchema }))
      .output(districtsResponseSchema),
  },
  centers: {
    search: oc.input(centerSearchQuerySchema).output(centerSearchResponseSchema),
    byCode: oc.input(centerByCodeQuerySchema).output(centerSearchResultSchema),
    classes: oc.input(centerIdInputSchema).output(centerClassesResponseSchema),
  },
  teacher: {
    classes: oc.input(emptyInputSchema).output(teacherClassesResponseSchema),
    classChildren: oc
      .input(z.object({ classId: uuidSchema }))
      .output(z.array(classRosterChildSchema)),
  },
  director: {
    joinRequests: oc
      .input(listJoinRequestsInputSchema)
      .output(z.array(joinRequestRowSchema)),
    approveJoinRequest: oc
      .input(approveJoinRequestInputSchema)
      .output(joinRequestActionResponseSchema),
    rejectJoinRequest: oc
      .input(rejectJoinRequestInputSchema)
      .output(joinRequestActionResponseSchema),
    invitations: oc
      .input(centerIdInputSchema)
      .output(z.array(invitationRowSchema)),
    createInvitation: oc
      .input(createInvitationInputSchema)
      .output(createInvitationResponseSchema),
    resendInvitation: oc
      .input(invitationIdInputSchema)
      .output(resendInvitationResponseSchema),
    revokeInvitation: oc
      .input(invitationIdInputSchema)
      .output(revokeInvitationResponseSchema),
    classes: oc.input(centerIdInputSchema).output(classListResponseSchema),
    class: oc.input(centerClassInputSchema).output(classDetailSchema),
    createClass: oc
      .input(centerIdInputSchema.extend({ body: createClassRequestSchema }))
      .output(classDetailSchema),
    updateClass: oc
      .input(centerClassInputSchema.extend({ body: updateClassRequestSchema }))
      .output(classDetailSchema),
    archiveClass: oc.input(centerClassInputSchema).output(classDetailSchema),
    restoreClass: oc.input(centerClassInputSchema).output(classDetailSchema),
    teachers: oc.input(centerIdInputSchema).output(centerTeachersResponseSchema),
    assignTeacher: oc
      .input(centerClassInputSchema.extend({ body: assignTeacherRequestSchema }))
      .output(assignTeacherResponseSchema),
    unassignTeacher: oc
      .input(centerClassInputSchema.extend({ teacherUserId: uuidSchema }))
      .output(successResponseSchema),
    updateTeacher: oc
      .input(
        centerIdInputSchema.extend({
          userId: uuidSchema,
          body: updateTeacherPermissionsRequestSchema,
        }),
      )
      .output(updateTeacherResponseSchema),
  },
  reports: {
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
    bulkCreateDrafts: oc
      .input(bulkReportsInputSchema)
      .output(bulkDraftsResultSchema),
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
    deleteComment: oc.input(deleteCommentInputSchema).output(successResponseSchema),
  },
};

export type AppContract = typeof appContract;
