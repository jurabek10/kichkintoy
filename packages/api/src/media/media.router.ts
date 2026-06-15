import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createMediaRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    createUploadUrl: os.media.createUploadUrl
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.mediaService.createUploadUrl(context.user.id, input),
      ),
    completeUpload: os.media.completeUpload
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.mediaService.completeUpload(context.user.id, input.mediaAssetId),
      ),
    getDownloadUrl: os.media.getDownloadUrl
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.mediaService.getDownloadUrl(context.user.id, input.mediaAssetId),
      ),
  };
}
