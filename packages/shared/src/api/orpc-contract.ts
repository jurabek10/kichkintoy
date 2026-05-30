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
const successResponseSchema = z.object({ success: z.literal(true) });
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

const joinRequestRowSchema = z.object({
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

const invitationRowSchema = z.object({
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
const joinRequestActionResponseSchema = z.object({
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
const createInvitationResponseSchema = z.object({
  id: uuidSchema,
  kind: invitationKindSchema,
  phone: z.string(),
  classId: uuidSchema.nullable(),
  expiresAt: isoDateTimeSchema,
  sentAt: isoDateTimeSchema.nullable(),
  smsProvider: z.string(),
  smsDelivered: z.boolean(),
});
const resendInvitationResponseSchema = z.object({
  id: uuidSchema,
  expiresAt: isoDateTimeSchema,
  sentAt: isoDateTimeSchema.nullable(),
  smsDelivered: z.boolean(),
});
const revokeInvitationResponseSchema = z.object({
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

export const appContract = {
  auth: {
    sendCode: oc
      .input(sendCodeRequestSchema)
      .output(z.unknown()),
    verifyCode: oc
      .input(verifyCodeRequestSchema)
      .output(z.unknown()),
    register: oc.input(registerRequestSchema).output(authResponseSchema),
    login: oc.input(loginRequestSchema).output(z.unknown()),
    logout: oc.input(logoutInputSchema).output(z.unknown()),
    lookupInvitations: oc
      .input(lookupInvitationsRequestSchema)
      .output(z.unknown()),
    me: oc.input(emptyInputSchema).output(z.unknown()),
    myInvitations: oc
      .input(emptyInputSchema)
      .output(z.unknown()),
    acceptInvitation: oc
      .input(idInputSchema.extend({ body: acceptInvitationRequestSchema }))
      .output(z.unknown()),
    declineInvitation: oc.input(idInputSchema).output(z.unknown()),
    submitJoinRequest: oc
      .input(submitJoinRequestSchema)
      .output(z.unknown()),
    cancelJoinRequest: oc
      .input(idInputSchema)
      .output(z.unknown()),
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
      .output(z.unknown()),
  },
  director: {
    joinRequests: oc
      .input(listJoinRequestsInputSchema)
      .output(z.unknown()),
    approveJoinRequest: oc
      .input(approveJoinRequestInputSchema)
      .output(z.unknown()),
    rejectJoinRequest: oc
      .input(rejectJoinRequestInputSchema)
      .output(z.unknown()),
    invitations: oc
      .input(centerIdInputSchema)
      .output(z.unknown()),
    createInvitation: oc
      .input(createInvitationInputSchema)
      .output(z.unknown()),
    resendInvitation: oc
      .input(invitationIdInputSchema)
      .output(z.unknown()),
    revokeInvitation: oc
      .input(invitationIdInputSchema)
      .output(z.unknown()),
    classes: oc.input(centerIdInputSchema).output(z.unknown()),
    class: oc.input(centerClassInputSchema).output(z.unknown()),
    createClass: oc
      .input(centerIdInputSchema.extend({ body: createClassRequestSchema }))
      .output(z.unknown()),
    updateClass: oc
      .input(centerClassInputSchema.extend({ body: updateClassRequestSchema }))
      .output(z.unknown()),
    archiveClass: oc.input(centerClassInputSchema).output(z.unknown()),
    restoreClass: oc.input(centerClassInputSchema).output(z.unknown()),
    teachers: oc.input(centerIdInputSchema).output(centerTeachersResponseSchema),
    assignTeacher: oc
      .input(centerClassInputSchema.extend({ body: assignTeacherRequestSchema }))
      .output(z.unknown()),
    unassignTeacher: oc
      .input(centerClassInputSchema.extend({ teacherUserId: uuidSchema }))
      .output(z.unknown()),
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
    teacherList: oc.input(listReportsInputSchema).output(z.unknown()),
    create: oc.input(createDailyReportRequestSchema).output(z.unknown()),
    teacherDetail: oc.input(reportIdInputSchema).output(z.unknown()),
    update: oc.input(updateReportInputSchema).output(z.unknown()),
    publish: oc.input(publishReportInputSchema).output(z.unknown()),
    unpublish: oc.input(reportIdInputSchema).output(z.unknown()),
    delete: oc.input(reportIdInputSchema).output(z.unknown()),
    bulkCreateDrafts: oc
      .input(bulkReportsInputSchema)
      .output(z.unknown()),
    publishDrafts: oc
      .input(bulkReportsInputSchema)
      .output(z.unknown()),
    classStatuses: oc
      .input(classReportsInputSchema)
      .output(z.unknown()),
    reads: oc.input(reportIdInputSchema).output(z.unknown()),
    staffComment: oc.input(reportCommentInputSchema).output(z.unknown()),
    parentChildren: oc
      .input(emptyInputSchema)
      .output(z.unknown()),
    parentList: oc.input(parentReportsInputSchema).output(z.unknown()),
    parentDetail: oc.input(reportIdInputSchema).output(z.unknown()),
    parentComment: oc.input(reportCommentInputSchema).output(z.unknown()),
    deleteComment: oc.input(deleteCommentInputSchema).output(z.unknown()),
  },
};

export type AppContract = typeof appContract;
