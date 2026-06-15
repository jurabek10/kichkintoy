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
  };
}
