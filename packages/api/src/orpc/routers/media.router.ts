import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createMediaRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    createUploadUrl: os.media.createUploadUrl.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.mediaService.createUploadUrl(user.id, input);
      },
    ),
    completeUpload: os.media.completeUpload.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.mediaService.completeUpload(user.id, input.mediaAssetId);
      },
    ),
    getDownloadUrl: os.media.getDownloadUrl.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.mediaService.getDownloadUrl(user.id, input.mediaAssetId);
      },
    ),
  };
}
