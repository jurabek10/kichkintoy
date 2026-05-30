import {
  requireCenterAccess,
  requireUser,
  type ORPCDeps,
  type ORPCImplementer,
} from "../context";
import { createInvitationSchema } from "../../director/director.schemas";
import { centerTeachersResponseSchema } from "@kichkintoy/shared";

export function createDirectorRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    joinRequests: os.director.joinRequests.handler(
      async ({ input, context }) => {
        await requireCenterAccess(deps.prisma, context.req, input.centerId);
        return deps.directorService.listJoinRequests(input.centerId, {
          status: input.status,
        });
      },
    ),
    approveJoinRequest: os.director.approveJoinRequest.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        const accessLevel = await requireCenterAccess(
          deps.prisma,
          context.req,
          input.centerId,
        );
        return deps.directorService.approveJoinRequest({
          centerId: input.centerId,
          requestId: input.requestId,
          reviewerUserId: user.id,
          accessLevel,
          input: { classId: input.classId },
        });
      },
    ),
    rejectJoinRequest: os.director.rejectJoinRequest.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        const accessLevel = await requireCenterAccess(
          deps.prisma,
          context.req,
          input.centerId,
        );
        return deps.directorService.rejectJoinRequest({
          centerId: input.centerId,
          requestId: input.requestId,
          reviewerUserId: user.id,
          accessLevel,
          input: { reason: input.reason },
        });
      },
    ),
    invitations: os.director.invitations.handler(
      async ({ input, context }) => {
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.directorService.listInvitations(input.centerId);
      },
    ),
    createInvitation: os.director.createInvitation.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.directorService.createInvitation({
          centerId: input.centerId,
          createdByUserId: user.id,
          input: createInvitationSchema.parse(input),
        });
      },
    ),
    resendInvitation: os.director.resendInvitation.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.directorService.resendInvitation({
          centerId: input.centerId,
          invitationId: input.invitationId,
          actorUserId: user.id,
        });
      },
    ),
    revokeInvitation: os.director.revokeInvitation.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.directorService.revokeInvitation({
          centerId: input.centerId,
          invitationId: input.invitationId,
          actorUserId: user.id,
        });
      },
    ),
    classes: os.director.classes.handler(async ({ input, context }) => {
      await requireCenterAccess(deps.prisma, context.req, input.centerId);
      return deps.classService.listClasses(input.centerId);
    }),
    class: os.director.class.handler(async ({ input, context }) => {
      await requireCenterAccess(deps.prisma, context.req, input.centerId);
      return deps.classService.getClass(input.centerId, input.classId);
    }),
    createClass: os.director.createClass.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.classService.createClass({
          centerId: input.centerId,
          actorUserId: user.id,
          input: input.body,
        });
      },
    ),
    updateClass: os.director.updateClass.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.classService.updateClass({
          centerId: input.centerId,
          classId: input.classId,
          actorUserId: user.id,
          input: input.body,
        });
      },
    ),
    archiveClass: os.director.archiveClass.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.classService.archiveClass({
          centerId: input.centerId,
          classId: input.classId,
          actorUserId: user.id,
        });
      },
    ),
    restoreClass: os.director.restoreClass.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.classService.restoreClass({
          centerId: input.centerId,
          classId: input.classId,
          actorUserId: user.id,
        });
      },
    ),
    teachers: os.director.teachers.handler(async ({ input, context }) => {
      await requireCenterAccess(deps.prisma, context.req, input.centerId, {
        directorOnly: true,
      });
      const rows = await deps.classService.listTeachers(input.centerId);
      return centerTeachersResponseSchema.parse(rows);
    }),
    assignTeacher: os.director.assignTeacher.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.classService.assignTeacher({
          centerId: input.centerId,
          classId: input.classId,
          actorUserId: user.id,
          input: input.body,
        });
      },
    ),
    unassignTeacher: os.director.unassignTeacher.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.classService.unassignTeacher({
          centerId: input.centerId,
          classId: input.classId,
          teacherUserId: input.teacherUserId,
          actorUserId: user.id,
        });
      },
    ),
    updateTeacher: os.director.updateTeacher.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        await requireCenterAccess(deps.prisma, context.req, input.centerId, {
          directorOnly: true,
        });
        return deps.directorService.updateTeacher({
          centerId: input.centerId,
          teacherUserId: input.userId,
          actorUserId: user.id,
          input: input.body,
        });
      },
    ),
  };
}
