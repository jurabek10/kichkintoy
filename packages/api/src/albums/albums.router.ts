import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createAlbumsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    audience: os.albums.audience.use(access.authed).handler(async ({ input, context }) => {
      return deps.albumsService.audience(context.user.id, input.centerId);
    }),
    staffList: os.albums.staffList.use(access.authed).handler(async ({ input, context }) => {
      return deps.albumsService.listForStaff(
        context.user.id,
        input.centerId,
        input.status,
      );
    }),
    parentList: os.albums.parentList.use(access.authed).handler(async ({ input, context }) => {
      return deps.albumsService.listForParent(context.user.id, input?.childId);
    }),
    detail: os.albums.detail.use(access.authed).handler(async ({ input, context }) => {
      return deps.albumsService.get(context.user.id, input.postId);
    }),
    create: os.albums.create.use(access.authed).handler(async ({ input, context }) => {
      return deps.albumsService.create(context.user.id, input);
    }),
    update: os.albums.update.use(access.authed).handler(async ({ input, context }) => {
      return deps.albumsService.update(context.user.id, input.postId, input.body);
    }),
    publish: os.albums.publish.use(access.authed).handler(async ({ input, context }) => {
      return deps.albumsService.publish(context.user.id, input.postId);
    }),
    delete: os.albums.delete.use(access.authed).handler(async ({ input, context }) => {
      return deps.albumsService.delete(context.user.id, input.postId);
    }),
    addComment: os.albums.addComment.use(access.authed).handler(async ({ input, context }) => {
      return deps.albumsService.addComment(
        context.user.id,
        input.postId,
        input.body,
      );
    }),
    deleteComment: os.albums.deleteComment.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.albumsService.deleteComment(
          context.user.id,
          input.postId,
          input.commentId,
        );
      },
    ),
    toggleReaction: os.albums.toggleReaction.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.albumsService.toggleReaction(context.user.id, input.postId);
      },
    ),
  };
}
