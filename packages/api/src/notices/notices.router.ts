import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createNoticesRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    audience: os.notices.audience.use(access.authed).handler(async ({ input, context }) => {
      return deps.noticesService.audience(context.user.id, input.centerId);
    }),
    authorList: os.notices.authorList.use(access.authed).handler(async ({ input, context }) => {
      return deps.noticesService.listForAuthor(
        context.user.id,
        input.centerId,
        input.status,
      );
    }),
    create: os.notices.create.use(access.authed).handler(async ({ input, context }) => {
      return deps.noticesService.create(context.user.id, input);
    }),
    authorDetail: os.notices.authorDetail.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.noticesService.getForAuthor(context.user.id, input.noticeId);
      },
    ),
    update: os.notices.update.use(access.authed).handler(async ({ input, context }) => {
      return deps.noticesService.update(context.user.id, input.noticeId, input.body);
    }),
    publish: os.notices.publish.use(access.authed).handler(async ({ input, context }) => {
      return deps.noticesService.publish(context.user.id, input.noticeId, input.body);
    }),
    unpublish: os.notices.unpublish.use(access.authed).handler(async ({ input, context }) => {
      return deps.noticesService.unpublish(context.user.id, input.noticeId);
    }),
    delete: os.notices.delete.use(access.authed).handler(async ({ input, context }) => {
      return deps.noticesService.delete(context.user.id, input.noticeId);
    }),
    parentList: os.notices.parentList.use(access.authed).handler(async ({ context }) => {
      return deps.noticesService.listForParent(context.user.id);
    }),
    parentChildList: os.notices.parentChildList.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.noticesService.listForParent(context.user.id, input.childId);
      },
    ),
    parentDetail: os.notices.parentDetail.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.noticesService.getForParent(context.user.id, input.noticeId);
      },
    ),
    confirm: os.notices.confirm.use(access.authed).handler(async ({ input, context }) => {
      return deps.noticesService.confirm(context.user.id, input.noticeId);
    }),
    addComment: os.notices.addComment.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.noticesService.addComment(
          context.user.id,
          input.noticeId,
          input.body.body,
        );
      },
    ),
    deleteComment: os.notices.deleteComment.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.noticesService.deleteComment(
          context.user.id,
          input.noticeId,
          input.commentId,
        );
      },
    ),
  };
}
