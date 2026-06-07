import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../database/prisma.service";

const ticketTtlMs = 60_000;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function resolveWsUrl(ticket: string): string {
  const configured = process.env.WS_PUBLIC_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    url.searchParams.set("ticket", ticket);
    return url.toString();
  }

  const port = process.env.PORT ?? "4000";
  return `ws://localhost:${port}/ws?ticket=${encodeURIComponent(ticket)}`;
}

@Injectable()
export class RealtimeService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(userId: string) {
    const ticket = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + ticketTtlMs);

    await this.prisma.realtimeTicket.create({
      data: {
        userId,
        tokenHash: sha256(ticket),
        expiresAt,
      },
    });

    void this.cleanupExpiredTickets();

    return {
      ticket,
      expiresAt: expiresAt.toISOString(),
      wsUrl: resolveWsUrl(ticket),
    };
  }

  async consumeTicket(ticket: string): Promise<{ userId: string }> {
    const now = new Date();
    const tokenHash = sha256(ticket);
    const stored = await this.prisma.realtimeTicket.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!stored || stored.usedAt || stored.expiresAt <= now) {
      throw new UnauthorizedException("Realtime ticket is invalid or expired.");
    }

    const consumed = await this.prisma.realtimeTicket.updateMany({
      where: {
        id: stored.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (consumed.count !== 1) {
      throw new UnauthorizedException("Realtime ticket was already used.");
    }

    return { userId: stored.userId };
  }

  private async cleanupExpiredTickets() {
    const olderThan = new Date(Date.now() - 5 * 60_000);
    await this.prisma.realtimeTicket.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: olderThan } }, { usedAt: { not: null } }],
      },
    });
  }
}
