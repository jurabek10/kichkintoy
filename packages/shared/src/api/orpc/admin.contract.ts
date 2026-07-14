import { oc } from "@orpc/contract";
import { z } from "zod";
import { facilityTypeSchema } from "../../centers/facility-type.js";
import { centerStatusSchema } from "../../centers/status.js";
import { invitationStatusSchema } from "../../membership/invitation.js";
import {
  isoDateSchema,
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
  platformBaseFeeUzs: z.number().nonnegative(),
  platformPerKidFeeUzs: z.number().nonnegative(),
  platformBillingDay: z.number().int(),
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

const billingDaySchema = z.number().int().min(1).max(28);
const platformFeeSchema = z.number().nonnegative().max(1_000_000_000);

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
  // Platform subscription the center pays the founder.
  platformBaseFeeUzs: platformFeeSchema,
  platformPerKidFeeUzs: platformFeeSchema,
  platformBillingDay: billingDaySchema,
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

// --- Platform billing (founder payments) --------------------------------
// What each center owes the founder each month:
//   total = baseFeeUzs + kidCount * perKidFeeUzs

export const billingStatusSchema = z.enum(["paid", "due", "overdue"]);
export type BillingStatus = z.infer<typeof billingStatusSchema>;

export const adminBillingRowSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  centerCode: z.string(),
  baseFeeUzs: z.number().nonnegative(),
  perKidFeeUzs: z.number().nonnegative(),
  billingDay: z.number().int(),
  kidCount: nonNegativeInt,
  total: z.number().nonnegative(),
  // Payment status for the current month.
  status: billingStatusSchema,
  paidAt: isoDateTimeSchema.nullable(),
});
export type AdminBillingRow = z.infer<typeof adminBillingRowSchema>;

export const adminBillingListSchema = z.object({
  // The month these statuses apply to, as an ISO date (first of month).
  period: isoDateTimeSchema,
  rows: z.array(adminBillingRowSchema),
  grandTotal: z.number().nonnegative(),
  collected: z.number().nonnegative(),
  outstanding: z.number().nonnegative(),
});
export type AdminBillingList = z.infer<typeof adminBillingListSchema>;

export const adminBillingPricingInputSchema = centerIdInputSchema.extend({
  baseFeeUzs: z.number().nonnegative().max(1_000_000_000),
  perKidFeeUzs: z.number().nonnegative().max(1_000_000_000),
  billingDay: z.number().int().min(1).max(28),
});

export const adminBillingSetPaidInputSchema = centerIdInputSchema.extend({
  paid: z.boolean(),
  note: z.string().trim().max(300).optional(),
});

// --- Scheduled job monitoring --------------------------------------------

export const cronRunStatusSchema = z.enum(["running", "succeeded", "failed"]);
export type CronRunStatus = z.infer<typeof cronRunStatusSchema>;

export const adminCronRunSchema = z.object({
  id: uuidSchema,
  jobName: z.string(),
  runDate: isoDateSchema,
  startedAt: isoDateTimeSchema,
  finishedAt: isoDateTimeSchema.nullable(),
  status: cronRunStatusSchema,
  sentCount: nonNegativeInt,
  error: z.string().nullable(),
});
export type AdminCronRun = z.infer<typeof adminCronRunSchema>;

export const adminCronJobSchema = z.object({
  name: z.string(),
  cronExpression: z.string(),
  descriptionKey: z.string(),
  latestRun: adminCronRunSchema.nullable(),
});
export type AdminCronJob = z.infer<typeof adminCronJobSchema>;

export const adminCronRunsInputSchema = z.object({
  jobName: z.string().optional(),
  status: cronRunStatusSchema.optional(),
  page: z.number().int().positive().default(1),
});

export const adminCronRunsResponseSchema = z.object({
  items: z.array(adminCronRunSchema),
  page: z.number().int().positive(),
  pageSize: z.literal(10),
  total: nonNegativeInt,
  totalPages: nonNegativeInt,
});
export type AdminCronRunsResponse = z.infer<typeof adminCronRunsResponseSchema>;

export const adminCronStatsSchema = z.object({
  jobName: z.string(),
  totalRuns: nonNegativeInt,
  successRate: z.number().min(0).max(100),
  sentTotal: nonNegativeInt,
  failureCount: nonNegativeInt,
});
export type AdminCronStats = z.infer<typeof adminCronStatsSchema>;

export const adminCronRunNowInputSchema = z.object({
  jobName: z.string(),
  runDate: isoDateSchema.optional(),
});

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
  billing: {
    list: oc.input(emptyInputSchema).output(adminBillingListSchema),
    setPricing: oc
      .input(adminBillingPricingInputSchema)
      .output(successResponseSchema),
    setPaid: oc
      .input(adminBillingSetPaidInputSchema)
      .output(successResponseSchema),
  },
  crons: {
    list: oc.input(emptyInputSchema).output(z.array(adminCronJobSchema)),
    runs: oc
      .input(adminCronRunsInputSchema)
      .output(adminCronRunsResponseSchema),
    stats: oc
      .input(z.object({ jobName: z.string() }))
      .output(adminCronStatsSchema),
    runNow: oc.input(adminCronRunNowInputSchema).output(adminCronRunSchema),
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
