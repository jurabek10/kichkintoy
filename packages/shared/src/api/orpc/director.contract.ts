import { oc } from "@orpc/contract";
import { z } from "zod";
import {
  invitationKindSchema,
  invitationStatusSchema,
  joinRequestKindSchema,
  joinRequestStatusSchema,
} from "../../membership/index.js";
import {
  isoDateTimeSchema,
  phoneNumberSchema,
  uuidSchema,
} from "../../lib/validators.js";
import {
  assignTeacherRequestSchema,
  centerTeachersResponseSchema,
  classDetailSchema,
  classListResponseSchema,
  createClassRequestSchema,
  updateClassRequestSchema,
  updateTeacherPermissionsRequestSchema,
} from "../classes.js";
import {
  centerClassInputSchema,
  centerIdInputSchema,
  successResponseSchema,
} from "./common.contract.js";

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

const assignTeacherResponseSchema = z.object({
  id: uuidSchema,
  alreadyAssigned: z.boolean(),
});

const updateTeacherResponseSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  canApproveMembers: z.boolean(),
});

export const directorContract = {
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
};
