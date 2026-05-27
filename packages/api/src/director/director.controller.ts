import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ZodError, type ZodSchema } from "zod";
import { CurrentUser } from "../auth/current-user.decorator";
import {
  SessionGuard,
  type AuthenticatedUser,
} from "../auth/session.guard";
import {
  CenterApproverGuard,
  DirectorOnly,
  type RequestWithCenterAccess,
} from "./director.guard";
import {
  approveJoinRequestSchema,
  createInvitationSchema,
  listJoinRequestsQuerySchema,
  rejectJoinRequestSchema,
  updateTeacherSchema,
} from "./director.schemas";
import { DirectorService } from "./director.service";

@Controller("director/centers/:centerId")
@UseGuards(SessionGuard, CenterApproverGuard)
export class DirectorController {
  constructor(private readonly directorService: DirectorService) {}

  @Get("join-requests")
  listJoinRequests(
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Query() query: unknown,
  ) {
    const parsed = parseInput(listJoinRequestsQuerySchema, query ?? {});
    return this.directorService.listJoinRequests(centerId, parsed);
  }

  @Post("join-requests/:requestId/approve")
  approveJoinRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithCenterAccess,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("requestId", new ParseUUIDPipe()) requestId: string,
    @Body() body: unknown,
  ) {
    const parsed = parseInput(approveJoinRequestSchema, body ?? {});
    return this.directorService.approveJoinRequest({
      centerId,
      requestId,
      reviewerUserId: user.id,
      accessLevel: request.centerAccess ?? "approver_teacher",
      input: parsed,
    });
  }

  @Post("join-requests/:requestId/reject")
  rejectJoinRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithCenterAccess,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("requestId", new ParseUUIDPipe()) requestId: string,
    @Body() body: unknown,
  ) {
    const parsed = parseInput(rejectJoinRequestSchema, body ?? {});
    return this.directorService.rejectJoinRequest({
      centerId,
      requestId,
      reviewerUserId: user.id,
      accessLevel: request.centerAccess ?? "approver_teacher",
      input: parsed,
    });
  }

  @Get("invitations")
  @DirectorOnly()
  listInvitations(@Param("centerId", new ParseUUIDPipe()) centerId: string) {
    return this.directorService.listInvitations(centerId);
  }

  @Post("invitations")
  @DirectorOnly()
  createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Body() body: unknown,
  ) {
    const parsed = parseInput(createInvitationSchema, body ?? {});
    return this.directorService.createInvitation({
      centerId,
      createdByUserId: user.id,
      input: parsed,
    });
  }

  @Post("invitations/:invitationId/resend")
  @DirectorOnly()
  resendInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("invitationId", new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.directorService.resendInvitation({
      centerId,
      invitationId,
      actorUserId: user.id,
    });
  }

  @Delete("invitations/:invitationId")
  @DirectorOnly()
  revokeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("invitationId", new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.directorService.revokeInvitation({
      centerId,
      invitationId,
      actorUserId: user.id,
    });
  }

  @Patch("teachers/:userId")
  @DirectorOnly()
  updateTeacher(
    @CurrentUser() user: AuthenticatedUser,
    @Param("centerId", new ParseUUIDPipe()) centerId: string,
    @Param("userId", new ParseUUIDPipe()) teacherUserId: string,
    @Body() body: unknown,
  ) {
    const parsed = parseInput(updateTeacherSchema, body ?? {});
    return this.directorService.updateTeacher({
      centerId,
      teacherUserId,
      actorUserId: user.id,
      input: parsed,
    });
  }
}

function parseInput<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        message: "Validation failed.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    throw error;
  }
}
