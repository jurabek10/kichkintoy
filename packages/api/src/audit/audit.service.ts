import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

export type AuditLogInput = {
  organizationId?: string | null;
  centerId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(input: AuditLogInput, tx?: Prisma.TransactionClient) {
    const client: Prisma.TransactionClient | PrismaService = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        centerId: input.centerId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }
}
