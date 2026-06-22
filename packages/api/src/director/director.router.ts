import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";
import { createInvitationSchema } from "./director.schemas";
import {
  centerTeachersResponseSchema,
  classListResponseSchema,
  createInvitationResponseSchema,
  invitationRowSchema,
  joinRequestActionResponseSchema,
  joinRequestRowSchema,
  resendInvitationResponseSchema,
  revokeInvitationResponseSchema,
} from "@kichkintoy/shared";

export function createDirectorRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    homeSummary: os.director.homeSummary
      .use(access.directorOnly)
      .handler(async ({ input }) =>
        deps.directorService.getHomeSummary(input.centerId),
      ),
    joinRequests: os.director.joinRequests
      .use(access.centerMember)
      .handler(async ({ input }) =>
        joinRequestRowSchema
          .array()
          .parse(
            await deps.directorService.listJoinRequests(input.centerId, {
              status: input.status,
            }),
          ),
      ),
    approveJoinRequest: os.director.approveJoinRequest
      .use(access.centerMember)
      .handler(async ({ input, context }) =>
        joinRequestActionResponseSchema.parse(
          await deps.directorService.approveJoinRequest({
            centerId: input.centerId,
            requestId: input.requestId,
            reviewerUserId: context.user.id,
            accessLevel: context.access,
            input: { classId: input.classId },
          }),
        ),
      ),
    rejectJoinRequest: os.director.rejectJoinRequest
      .use(access.centerMember)
      .handler(async ({ input, context }) =>
        joinRequestActionResponseSchema.parse(
          await deps.directorService.rejectJoinRequest({
            centerId: input.centerId,
            requestId: input.requestId,
            reviewerUserId: context.user.id,
            accessLevel: context.access,
            input: { reason: input.reason },
          }),
        ),
      ),
    invitations: os.director.invitations
      .use(access.directorOnly)
      .handler(async ({ input }) =>
        invitationRowSchema
          .array()
          .parse(await deps.directorService.listInvitations(input.centerId)),
      ),
    createInvitation: os.director.createInvitation
      .use(access.directorOnly)
      .handler(async ({ input, context }) =>
        createInvitationResponseSchema.parse(
          await deps.directorService.createInvitation({
            centerId: input.centerId,
            createdByUserId: context.user.id,
            input: createInvitationSchema.parse(input),
          }),
        ),
      ),
    resendInvitation: os.director.resendInvitation
      .use(access.directorOnly)
      .handler(async ({ input, context }) =>
        resendInvitationResponseSchema.parse(
          await deps.directorService.resendInvitation({
            centerId: input.centerId,
            invitationId: input.invitationId,
            actorUserId: context.user.id,
          }),
        ),
      ),
    revokeInvitation: os.director.revokeInvitation
      .use(access.directorOnly)
      .handler(async ({ input, context }) =>
        revokeInvitationResponseSchema.parse(
          await deps.directorService.revokeInvitation({
            centerId: input.centerId,
            invitationId: input.invitationId,
            actorUserId: context.user.id,
          }),
        ),
      ),
    classes: os.director.classes
      .use(access.centerMember)
      .handler(async ({ input }) =>
        classListResponseSchema.parse(
          await deps.classService.listClasses(input.centerId),
        ),
      ),
    class: os.director.class
      .use(access.centerMember)
      .handler(({ input }) =>
        deps.classService.getClass(input.centerId, input.classId),
      ),
    createClass: os.director.createClass
      .use(access.directorOnly)
      .handler(({ input, context }) =>
        deps.classService.createClass({
          centerId: input.centerId,
          actorUserId: context.user.id,
          input: input.body,
        }),
      ),
    updateClass: os.director.updateClass
      .use(access.directorOnly)
      .handler(({ input, context }) =>
        deps.classService.updateClass({
          centerId: input.centerId,
          classId: input.classId,
          actorUserId: context.user.id,
          input: input.body,
        }),
      ),
    archiveClass: os.director.archiveClass
      .use(access.directorOnly)
      .handler(({ input, context }) =>
        deps.classService.archiveClass({
          centerId: input.centerId,
          classId: input.classId,
          actorUserId: context.user.id,
        }),
      ),
    restoreClass: os.director.restoreClass
      .use(access.directorOnly)
      .handler(({ input, context }) =>
        deps.classService.restoreClass({
          centerId: input.centerId,
          classId: input.classId,
          actorUserId: context.user.id,
        }),
      ),
    child: os.director.child
      .use(access.centerMember)
      .handler(({ input }) =>
        deps.classService.getChild(input.centerId, input.childId),
      ),
    updateChild: os.director.updateChild
      .use(access.directorOnly)
      .handler(({ input, context }) =>
        deps.classService.updateChild({
          centerId: input.centerId,
          childId: input.childId,
          actorUserId: context.user.id,
          input: input.body,
        }),
      ),
    deleteChild: os.director.deleteChild
      .use(access.directorOnly)
      .handler(({ input, context }) =>
        deps.classService.deleteChild({
          centerId: input.centerId,
          childId: input.childId,
          actorUserId: context.user.id,
        }),
      ),
    teachers: os.director.teachers
      .use(access.directorOnly)
      .handler(async ({ input }) =>
        centerTeachersResponseSchema.parse(
          await deps.classService.listTeachers(input.centerId),
        ),
      ),
    assignTeacher: os.director.assignTeacher
      .use(access.directorOnly)
      .handler(({ input, context }) =>
        deps.classService.assignTeacher({
          centerId: input.centerId,
          classId: input.classId,
          actorUserId: context.user.id,
          input: input.body,
        }),
      ),
    unassignTeacher: os.director.unassignTeacher
      .use(access.directorOnly)
      .handler(({ input, context }) =>
        deps.classService.unassignTeacher({
          centerId: input.centerId,
          classId: input.classId,
          teacherUserId: input.teacherUserId,
          actorUserId: context.user.id,
        }),
      ),
    updateTeacher: os.director.updateTeacher
      .use(access.directorOnly)
      .handler(({ input, context }) =>
        deps.directorService.updateTeacher({
          centerId: input.centerId,
          teacherUserId: input.userId,
          actorUserId: context.user.id,
          input: input.body,
        }),
      ),
  };
}
