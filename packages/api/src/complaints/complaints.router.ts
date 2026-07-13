import { createAccess } from "../orpc/access";
import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";

export function createComplaintsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    create: os.complaints.create.use(access.authed).handler(({ input, context }) =>
      deps.complaintsService.create(context.user.id, input),
    ),
    parentList: os.complaints.parentList.use(access.authed).handler(({ input, context }) =>
      deps.complaintsService.parentList(context.user.id, input),
    ),
    staffList: os.complaints.staffList.use(access.authed).handler(({ input, context }) =>
      deps.complaintsService.staffList(context.user.id, input),
    ),
    detail: os.complaints.detail.use(access.authed).handler(({ input, context }) =>
      deps.complaintsService.detail(context.user.id, input.complaintId),
    ),
    reply: os.complaints.reply.use(access.authed).handler(({ input, context }) =>
      deps.complaintsService.reply(context.user.id, input.complaintId, input.body),
    ),
    setStatus: os.complaints.setStatus.use(access.authed).handler(({ input, context }) =>
      deps.complaintsService.setStatus(context.user.id, input),
    ),
    withdraw: os.complaints.withdraw.use(access.authed).handler(({ input, context }) =>
      deps.complaintsService.withdraw(context.user.id, input.complaintId),
    ),
    openCount: os.complaints.openCount.use(access.authed).handler(({ input, context }) =>
      deps.complaintsService.openCount(context.user.id, input.centerId),
    ),
  };
}
