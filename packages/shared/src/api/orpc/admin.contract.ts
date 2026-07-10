import { oc } from "@orpc/contract";
import { z } from "zod";
import { facilityTypeSchema } from "../../centers/facility-type.js";
import { centerStatusSchema } from "../../centers/status.js";
import { invitationStatusSchema } from "../../membership/invitation.js";
import {
  isoDateTimeSchema,
  phoneNumberSchema,
  uuidSchema,
} from "../../lib/validators.js";
import {
  centerIdInputSchema,
  emptyInputSchema,
  successResponseSchema,
} from "./common.contract.js";

const nonNegativeInt = z.number().int().nonnegative();

/**
 * Platform admin (founder) contract. Business-level aggregates and director
 * contact info only — child and teacher name lists are intentionally never
 * exposed by these endpoints.
 */

export const adminOverviewStatsSchema = z.object({
  totals: z.object({
    centers: nonNegativeInt,
    children: nonNegativeInt,
    teachers: nonNegativeInt,
    classes: nonNegativeInt,
    parents: nonNegativeInt,
  }),
  centersByStatus: z.object({
    active: nonNegativeInt,
    suspended: nonNegativeInt,
  }),
  centersByRegion: z.array(
    z.object({
      region: z.string().nullable(),
      count: nonNegativeInt,
    }),
  ),
  newestCenters: z.array(
    z.object({
      id: uuidSchema,
      name: z.string(),
      centerCode: z.string(),
      region: z.string().nullable(),
      district: z.string().nullable(),
      status: centerStatusSchema,
      createdAt: isoDateTimeSchema,
      directorName: z.string().nullable(),
    }),
  ),
});
export type AdminOverviewStats = z.infer<typeof adminOverviewStatsSchema>;

export const adminCenterDirectorSchema = z.object({
  id: uuidSchema,
  fullName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});
export type AdminCenterDirector = z.infer<typeof adminCenterDirectorSchema>;

export const adminCenterRowSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  centerCode: z.string(),
  facilityType: facilityTypeSchema,
  region: z.string().nullable(),
  district: z.string().nullable(),
  regionId: uuidSchema.nullable(),
  districtId: uuidSchema.nullable(),
  status: centerStatusSchema,
  createdAt: isoDateTimeSchema,
  monthlyTuitionUzs: z.number().nonnegative(),
  director: adminCenterDirectorSchema.nullable(),
  counts: z.object({
    children: nonNegativeInt,
    teachers: nonNegativeInt,
    classes: nonNegativeInt,
  }),
});
export type AdminCenterRow = z.infer<typeof adminCenterRowSchema>;

export const adminDirectorInvitationSchema = z.object({
  id: uuidSchema,
  phone: z.string(),
  status: invitationStatusSchema,
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  sentAt: isoDateTimeSchema.nullable(),
  acceptedAt: isoDateTimeSchema.nullable(),
  revokedAt: isoDateTimeSchema.nullable(),
  invitedBy: z.object({ id: uuidSchema, fullName: z.string() }),
  acceptedBy: z.object({ id: uuidSchema, fullName: z.string() }).nullable(),
});
export type AdminDirectorInvitation = z.infer<
  typeof adminDirectorInvitationSchema
>;

export const adminCenterDetailSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  centerCode: z.string(),
  facilityType: facilityTypeSchema,
  phone: z.string().nullable(),
  address: z.string().nullable(),
  region: z.string().nullable(),
  district: z.string().nullable(),
  regionId: uuidSchema.nullable(),
  districtId: uuidSchema.nullable(),
  status: centerStatusSchema,
  createdAt: isoDateTimeSchema,
  monthlyTuitionUzs: z.number().nonnegative(),
  organization: z.object({ id: uuidSchema, name: z.string() }),
  director: adminCenterDirectorSchema.nullable(),
  stats: z.object({
    children: nonNegativeInt,
    teachers: nonNegativeInt,
    classes: nonNegativeInt,
    parents: nonNegativeInt,
  }),
  // Aggregates only — no child or teacher names cross this boundary.
  classes: z.array(
    z.object({
      id: uuidSchema,
      name: z.string(),
      teacherCount: nonNegativeInt,
      childCount: nonNegativeInt,
    }),
  ),
  invitations: z.array(adminDirectorInvitationSchema),
});
export type AdminCenterDetail = z.infer<typeof adminCenterDetailSchema>;

export const adminCenterFieldsSchema = z.object({
  name: z.string().trim().min(2).max(160),
  facilityType: facilityTypeSchema,
  regionId: uuidSchema,
  districtId: uuidSchema,
  address: z.string().trim().max(300).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{6,18}$/)
    .optional(),
  monthlyTuitionUzs: z.number().nonnegative().max(1_000_000_000),
});
export type AdminCenterFields = z.infer<typeof adminCenterFieldsSchema>;

export const adminSetCenterStatusInputSchema = centerIdInputSchema.extend({
  status: z.enum(["active", "suspended"]),
});

export const adminCreateDirectorInvitationInputSchema =
  centerIdInputSchema.extend({
    phone: phoneNumberSchema,
    expiresInDays: z.number().int().min(1).max(30).optional(),
  });

export const adminCreateDirectorInvitationResponseSchema = z.object({
  id: uuidSchema,
  phone: z.string(),
  expiresAt: isoDateTimeSchema,
  sentAt: isoDateTimeSchema.nullable(),
  smsDelivered: z.boolean(),
});

const invitationIdInputSchema = z.object({ invitationId: uuidSchema });

export const adminContract = {
  overview: {
    stats: oc.input(emptyInputSchema).output(adminOverviewStatsSchema),
  },
  centers: {
    list: oc.input(emptyInputSchema).output(z.array(adminCenterRowSchema)),
    get: oc.input(centerIdInputSchema).output(adminCenterDetailSchema),
    create: oc
      .input(z.object({ body: adminCenterFieldsSchema }))
      .output(z.object({ id: uuidSchema, centerCode: z.string() })),
    update: oc
      .input(
        centerIdInputSchema.extend({ body: adminCenterFieldsSchema.partial() }),
      )
      .output(successResponseSchema),
    setStatus: oc
      .input(adminSetCenterStatusInputSchema)
      .output(z.object({ id: uuidSchema, status: centerStatusSchema })),
  },
  invitations: {
    createDirector: oc
      .input(adminCreateDirectorInvitationInputSchema)
      .output(adminCreateDirectorInvitationResponseSchema),
    resend: oc.input(invitationIdInputSchema).output(
      z.object({
        id: uuidSchema,
        expiresAt: isoDateTimeSchema,
        sentAt: isoDateTimeSchema.nullable(),
        smsDelivered: z.boolean(),
      }),
    ),
    revoke: oc.input(invitationIdInputSchema).output(
      z.object({
        id: uuidSchema,
        revokedAt: isoDateTimeSchema.nullable(),
      }),
    ),
  },
};
