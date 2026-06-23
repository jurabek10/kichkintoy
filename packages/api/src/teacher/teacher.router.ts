import { type ORPCImplementer, type ORPCDeps } from "../orpc/context";
import { createAccess } from "../orpc/access";
import {
  classRosterChildSchema,
  teacherClassesResponseSchema,
} from "@kichkintoy/shared";

export function createTeacherRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    classes: os.teacher.classes
      .use(access.authed)
      .handler(async ({ context }) =>
        teacherClassesResponseSchema.parse(
          await deps.teacherService.listClasses(context.user.id),
        ),
      ),
    classChildren: os.teacher.classChildren
      .use(access.authed)
      .handler(async ({ input, context }) =>
        classRosterChildSchema
          .array()
          .parse(
            await deps.teacherService.listClassChildren(
              context.user.id,
              input.classId,
            ),
          ),
      ),
    // Child read/edit/remove, reusing the director's center-scoped operations
    // but gated by `requireChildAccess`: the teacher must be assigned to a class
    // the child is enrolled in. The derived center keeps the soft-delete and
    // audit-logging behaviour identical to the director's.
    child: os.teacher.child
      .use(access.authed)
      .handler(async ({ input, context }) => {
        const { centerId } = await deps.teacherService.requireChildAccess(
          context.user.id,
          input.childId,
        );
        return deps.classService.getChild(centerId, input.childId);
      }),
    updateChild: os.teacher.updateChild
      .use(access.authed)
      .handler(async ({ input, context }) => {
        const { centerId } = await deps.teacherService.requireChildAccess(
          context.user.id,
          input.childId,
        );
        return deps.classService.updateChild({
          centerId,
          childId: input.childId,
          actorUserId: context.user.id,
          input: input.body,
        });
      }),
    deleteChild: os.teacher.deleteChild
      .use(access.authed)
      .handler(async ({ input, context }) => {
        const { centerId } = await deps.teacherService.requireChildAccess(
          context.user.id,
          input.childId,
        );
        return deps.classService.deleteChild({
          centerId,
          childId: input.childId,
          actorUserId: context.user.id,
        });
      }),
  };
}
