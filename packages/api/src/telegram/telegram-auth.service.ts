import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../database/prisma.service";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

@Injectable()
export class TelegramAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async start() {
    const nonce = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.telegramLoginNonce.create({ data: { nonceHash: hash(nonce), expiresAt } });
    const username = process.env.TELEGRAM_BOT_USERNAME || "KichkintoyUzBot";
    return { nonce, deepLink: `https://t.me/${username}?start=login_${nonce}`, expiresAt: expiresAt.toISOString() };
  }

  async approve(nonce: string, telegramId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { telegramId }, select: { id: true } });
    if (!user) return false;
    const result = await this.prisma.telegramLoginNonce.updateMany({ where: { nonceHash: hash(nonce),
      approvedAt: null, consumedAt: null, expiresAt: { gt: new Date() } }, data: { userId: user.id, approvedAt: new Date() } });
    return result.count === 1;
  }

  async poll(nonce: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.telegramLoginNonce.findUnique({ where: { nonceHash: hash(nonce) } });
      if (!row || row.expiresAt <= new Date() || row.consumedAt) return { status: "expired" as const };
      if (!row.approvedAt || !row.userId) return { status: "pending" as const };
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const consumed = await tx.telegramLoginNonce.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
      if (!consumed.count) return { status: "expired" as const };
      await tx.authSession.create({ data: { userId: row.userId, tokenHash: hash(token), expiresAt } });
      await tx.user.update({ where: { id: row.userId }, data: { lastLoginAt: new Date() } });
      return { status: "approved" as const, token, expiresAt: expiresAt.toISOString() };
    });
  }
}
