import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../database/prisma.service";

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  username: string | null;
  phoneNumber: string | null;
  roles: Array<{
    name: string;
    organizationId: string | null;
    centerId: string | null;
    branchId: string | null;
  }>;
};

export type RequestWithUser = {
  headers?: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
  user?: AuthenticatedUser;
  sessionId?: string;
};

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers?.authorization as string | undefined;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Authentication required.");
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
      throw new UnauthorizedException("Authentication required.");
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user
    ) {
      throw new UnauthorizedException("Session is invalid or expired.");
    }

    request.user = {
      id: session.user.id,
      fullName: session.user.fullName,
      username: session.user.username,
      phoneNumber: session.user.phone,
      roles: session.user.userRoles.map((userRole) => ({
        name: userRole.role.name,
        organizationId: userRole.organizationId,
        centerId: userRole.centerId,
        branchId: userRole.branchId,
      })),
    };
    request.sessionId = session.id;
    return true;
  }
}
