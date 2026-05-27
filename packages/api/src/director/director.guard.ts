import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../database/prisma.service";
import type { RequestWithUser } from "../auth/session.guard";

const DIRECTOR_ROLE_NAMES = ["director", "organization_owner"];

export const DIRECTOR_ONLY_METADATA = "directorOnlyAccess";

/**
 * Apply this decorator to controller methods that may only be executed by an
 * actual director or organization owner. Teachers with `can_approve_members`
 * cannot bypass this restriction (e.g. acting on director-kind requests, or
 * managing invitations / teacher permissions).
 */
export const DirectorOnly = () => SetMetadata(DIRECTOR_ONLY_METADATA, true);

export type DirectorAccessLevel = "director" | "approver_teacher";

export type RequestWithCenterAccess = RequestWithUser & {
  centerAccess?: DirectorAccessLevel;
};

@Injectable()
export class CenterApproverGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithCenterAccess>();
    const user = request.user;
    const centerId = request.params?.centerId;

    if (!user) {
      throw new ForbiddenException("Authentication required.");
    }

    if (!centerId) {
      throw new ForbiddenException("Center id is required.");
    }

    const directorOnly = this.reflector.get<boolean>(
      DIRECTOR_ONLY_METADATA,
      context.getHandler(),
    );

    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { id: true, organizationId: true },
    });

    if (!center) {
      throw new ForbiddenException("Center not found.");
    }

    const directorMatch = await this.prisma.userRole.findFirst({
      where: {
        userId: user.id,
        role: { name: { in: DIRECTOR_ROLE_NAMES } },
        OR: [
          { centerId: center.id },
          {
            organizationId: center.organizationId,
            centerId: null,
          },
        ],
      },
    });

    if (directorMatch) {
      request.centerAccess = "director";
      return true;
    }

    if (directorOnly) {
      throw new ForbiddenException(
        "Director access is required for this action.",
      );
    }

    const teacherApprover = await this.prisma.userRole.findFirst({
      where: {
        userId: user.id,
        centerId: center.id,
        canApproveMembers: true,
        role: { name: "teacher" },
      },
    });

    if (teacherApprover) {
      request.centerAccess = "approver_teacher";
      return true;
    }

    throw new ForbiddenException(
      "You do not have approver access to this center.",
    );
  }
}
