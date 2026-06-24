import {
  requireCenterAccess,
  requireUser,
  type ORPCDeps,
  type ORPCImplementer,
} from "./context";

/**
 * Declarative access policy for oRPC procedures.
 *
 * Instead of every handler imperatively calling `requireUser` (and hoping no
 * one forgets), each procedure states its access requirement once with `.use`:
 *
 *   os.media.createUploadUrl.use(access.authed).handler(({ input, context }) =>
 *     deps.mediaService.createUploadUrl(context.user.id, input))
 *
 * The middleware enforces the requirement *before* the handler body runs and
 * injects the resolved `user` (and center `access` level) into the context, so
 * the body no longer re-derives them. The enforcement itself lives in one place
 * (`context.ts`) and is covered by `context.spec.ts`.
 *
 *   authed        — any signed-in user.
 *   centerStaff   — director OR any teacher of the center; read-only callers
 *                   (needs centerId). Use for center-scoped *reads* a teacher
 *                   may see but not act on.
 *   centerMember  — director OR approver-teacher of the center (needs centerId).
 *   directorOnly  — director / org-owner of the center (needs centerId).
 */
export function createAccess(os: ORPCImplementer, deps: ORPCDeps) {
  const authed = os.middleware(async ({ context, next }) => {
    const user = await requireUser(deps.prisma, context.req);
    return next({ context: { user } });
  });

  const centerStaff = os.middleware(
    async ({ context, next }, input: { centerId: string }) => {
      const user = await requireUser(deps.prisma, context.req);
      const access = await requireCenterAccess(
        deps.prisma,
        context.req,
        input.centerId,
        { allowAnyTeacher: true },
      );
      return next({ context: { user, access } });
    },
  );

  const centerMember = os.middleware(
    async ({ context, next }, input: { centerId: string }) => {
      const user = await requireUser(deps.prisma, context.req);
      const access = await requireCenterAccess(
        deps.prisma,
        context.req,
        input.centerId,
      );
      return next({ context: { user, access } });
    },
  );

  const directorOnly = os.middleware(
    async ({ context, next }, input: { centerId: string }) => {
      const user = await requireUser(deps.prisma, context.req);
      await requireCenterAccess(deps.prisma, context.req, input.centerId, {
        directorOnly: true,
      });
      return next({ context: { user } });
    },
  );

  return { authed, centerStaff, centerMember, directorOnly };
}

export type AccessPolicies = ReturnType<typeof createAccess>;
