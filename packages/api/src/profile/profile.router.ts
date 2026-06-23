import {
  requestContext,
  type ORPCDeps,
  type ORPCImplementer,
} from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createProfileRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    get: os.profile.get
      .use(access.authed)
      .handler(({ context }) => deps.profileService.get(context.user.id)),

    updateProfile: os.profile.updateProfile
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.profileService.updateProfile(context.user.id, input),
      ),

    updatePhone: os.profile.updatePhone
      .use(access.authed)
      .handler(async ({ input, context }) => {
        await deps.authService.changePhone(
          context.user.id,
          input.phoneNumber,
          input.phoneVerificationToken,
          requestContext(context.req),
        );
        return deps.profileService.get(context.user.id);
      }),

    changePassword: os.profile.changePassword
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.authService.changePassword(
          context.user.id,
          input.currentPassword,
          input.newPassword,
          requestContext(context.req),
        ),
      ),

    updateAvatar: os.profile.updateAvatar
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.profileService.updateAvatar(context.user.id, input.mediaAssetId),
      ),

    removeAvatar: os.profile.removeAvatar
      .use(access.authed)
      .handler(({ context }) =>
        deps.profileService.removeAvatar(context.user.id),
      ),

    updateNotificationSettings: os.profile.updateNotificationSettings
      .use(access.authed)
      .handler(({ input, context }) =>
        deps.profileService.updateNotificationSettings(context.user.id, input),
      ),
  };
}
