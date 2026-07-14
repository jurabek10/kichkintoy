import {
  adminBillingListSchema,
  adminCenterDetailSchema,
  adminCenterRowSchema,
  adminOverviewStatsSchema,
  adminCronJobSchema,
  adminCronRunSchema,
  adminCronRunsResponseSchema,
  adminCronStatsSchema,
} from "@kichkintoy/shared";
import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createAdminRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    overview: {
      stats: os.admin.overview.stats
        .use(access.superAdmin)
        .handler(async () =>
          adminOverviewStatsSchema.parse(
            await deps.adminService.overviewStats(),
          ),
        ),
    },
    centers: {
      list: os.admin.centers.list
        .use(access.superAdmin)
        .handler(async () =>
          adminCenterRowSchema
            .array()
            .parse(await deps.adminService.listCenters()),
        ),
      get: os.admin.centers.get
        .use(access.superAdmin)
        .handler(async ({ input }) =>
          adminCenterDetailSchema.parse(
            await deps.adminService.getCenter(input.centerId),
          ),
        ),
      create: os.admin.centers.create
        .use(access.superAdmin)
        .handler(({ input, context }) =>
          deps.adminService.createCenter({
            actorUserId: context.user.id,
            input: input.body,
          }),
        ),
      update: os.admin.centers.update
        .use(access.superAdmin)
        .handler(({ input, context }) =>
          deps.adminService.updateCenter({
            centerId: input.centerId,
            actorUserId: context.user.id,
            input: input.body,
          }),
        ),
      setStatus: os.admin.centers.setStatus
        .use(access.superAdmin)
        .handler(({ input, context }) =>
          deps.adminService.setCenterStatus({
            centerId: input.centerId,
            actorUserId: context.user.id,
            status: input.status,
          }),
        ),
    },
    billing: {
      list: os.admin.billing.list
        .use(access.superAdmin)
        .handler(async () =>
          adminBillingListSchema.parse(await deps.adminService.listBilling()),
        ),
      setPricing: os.admin.billing.setPricing
        .use(access.superAdmin)
        .handler(({ input, context }) =>
          deps.adminService.setBillingPricing({
            centerId: input.centerId,
            actorUserId: context.user.id,
            baseFeeUzs: input.baseFeeUzs,
            perKidFeeUzs: input.perKidFeeUzs,
            billingDay: input.billingDay,
          }),
        ),
      setPaid: os.admin.billing.setPaid
        .use(access.superAdmin)
        .handler(({ input, context }) =>
          deps.adminService.setBillingPaid({
            centerId: input.centerId,
            actorUserId: context.user.id,
            paid: input.paid,
            note: input.note,
          }),
        ),
    },
    crons: {
      list: os.admin.crons.list
        .use(access.superAdmin)
        .handler(async () =>
          adminCronJobSchema
            .array()
            .parse(await deps.adminCronService.listJobs()),
        ),
      runs: os.admin.crons.runs
        .use(access.superAdmin)
        .handler(async ({ input }) =>
          adminCronRunsResponseSchema.parse(
            await deps.adminCronService.listRuns(input),
          ),
        ),
      stats: os.admin.crons.stats
        .use(access.superAdmin)
        .handler(async ({ input }) =>
          adminCronStatsSchema.parse(
            await deps.adminCronService.stats(input.jobName),
          ),
        ),
      runNow: os.admin.crons.runNow
        .use(access.superAdmin)
        .handler(async ({ input, context }) =>
          adminCronRunSchema.parse(
            await deps.adminCronService.runNow({
              actorUserId: context.user.id,
              jobName: input.jobName,
              runDate: input.runDate,
            }),
          ),
        ),
    },
    invitations: {
      createDirector: os.admin.invitations.createDirector
        .use(access.superAdmin)
        .handler(({ input, context }) =>
          deps.adminService.createDirectorInvitation({
            centerId: input.centerId,
            actorUserId: context.user.id,
            phone: input.phone,
            expiresInDays: input.expiresInDays,
          }),
        ),
      resend: os.admin.invitations.resend
        .use(access.superAdmin)
        .handler(({ input, context }) =>
          deps.adminService.resendDirectorInvitation({
            invitationId: input.invitationId,
            actorUserId: context.user.id,
          }),
        ),
      revoke: os.admin.invitations.revoke
        .use(access.superAdmin)
        .handler(({ input, context }) =>
          deps.adminService.revokeDirectorInvitation({
            invitationId: input.invitationId,
            actorUserId: context.user.id,
          }),
        ),
    },
  };
}
