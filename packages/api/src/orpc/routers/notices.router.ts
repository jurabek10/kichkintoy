import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createNoticesRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    audience: os.notices.audience.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.noticesService.audience(user.id, input.centerId);
    }),
    authorList: os.notices.authorList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.noticesService.listForAuthor(
        user.id,
        input.centerId,
        input.status,
      );
    }),
    create: os.notices.create.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.noticesService.create(user.id, input);
    }),
    authorDetail: os.notices.authorDetail.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.noticesService.getForAuthor(user.id, input.noticeId);
      },
    ),
    update: os.notices.update.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.noticesService.update(user.id, input.noticeId, input.body);
    }),
    publish: os.notices.publish.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.noticesService.publish(user.id, input.noticeId, input.body);
    }),
    unpublish: os.notices.unpublish.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.noticesService.unpublish(user.id, input.noticeId);
    }),
    delete: os.notices.delete.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.noticesService.delete(user.id, input.noticeId);
    }),
    parentList: os.notices.parentList.handler(async ({ context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.noticesService.listForParent(user.id);
    }),
    parentChildList: os.notices.parentChildList.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.noticesService.listForParent(user.id, input.childId);
      },
    ),
    parentDetail: os.notices.parentDetail.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.noticesService.getForParent(user.id, input.noticeId);
      },
    ),
    confirm: os.notices.confirm.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.noticesService.confirm(user.id, input.noticeId);
    }),
  };
}
