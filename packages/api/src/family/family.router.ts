import { createAccess } from "../orpc/access";
import type { ORPCDeps, ORPCImplementer } from "../orpc/context";

export function createFamilyRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    listGuardians: os.family.listGuardians.use(access.authed).handler(({ context }) => deps.familyService.listGuardians(context.user.id)),
    createInvitation: os.family.createInvitation.use(access.authed).handler(({ input, context }) => deps.familyService.createInvitation(context.user.id, input.relationship)),
    revokeInvitation: os.family.revokeInvitation.use(access.authed).handler(({ input, context }) => deps.familyService.revokeInvitation(context.user.id, input.invitationId)),
    removeGuardian: os.family.removeGuardian.use(access.authed).handler(({ input, context }) => deps.familyService.removeGuardian(context.user.id, input.userId)),
  };
}
