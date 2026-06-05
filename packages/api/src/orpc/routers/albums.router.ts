import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createAlbumsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    audience: os.albums.audience.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.albumsService.audience(user.id, input.centerId);
    }),
    staffList: os.albums.staffList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.albumsService.listForStaff(
        user.id,
        input.centerId,
        input.status,
      );
    }),
    parentList: os.albums.parentList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.albumsService.listForParent(user.id, input?.childId);
    }),
    detail: os.albums.detail.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.albumsService.get(user.id, input.postId);
    }),
    create: os.albums.create.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.albumsService.create(user.id, input);
    }),
    update: os.albums.update.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.albumsService.update(user.id, input.postId, input.body);
    }),
    publish: os.albums.publish.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.albumsService.publish(user.id, input.postId);
    }),
    delete: os.albums.delete.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.albumsService.delete(user.id, input.postId);
    }),
    addComment: os.albums.addComment.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.albumsService.addComment(
        user.id,
        input.postId,
        input.body.body,
      );
    }),
    deleteComment: os.albums.deleteComment.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.albumsService.deleteComment(
          user.id,
          input.postId,
          input.commentId,
        );
      },
    ),
    toggleReaction: os.albums.toggleReaction.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.albumsService.toggleReaction(user.id, input.postId);
      },
    ),
  };
}
