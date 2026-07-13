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

  // --- Signup phone verification via Telegram contact share (purpose "verify") ---

  async startVerify() {
    const nonce = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.telegramLoginNonce.create({ data: { nonceHash: hash(nonce), purpose: "verify", expiresAt } });
    const username = process.env.TELEGRAM_BOT_USERNAME || "KichkintoyUzBot";
    return { nonce, deepLink: `https://t.me/${username}?start=verify_${nonce}`, expiresAt: expiresAt.toISOString() };
  }

  /** Bind the Telegram sender to the nonce when the deep link is opened, so the
   *  contact message that follows can be matched back to this signup attempt. */
  async bindVerify(nonce: string, telegramId: bigint) {
    const result = await this.prisma.telegramLoginNonce.updateMany({ where: { nonceHash: hash(nonce),
      purpose: "verify", approvedAt: null, consumedAt: null, expiresAt: { gt: new Date() } }, data: { telegramId } });
    return result.count === 1;
  }

  /** The sender shared their contact: issue a verified PhoneVerification usable by auth.register. */
  async completeVerify(telegram: { id: bigint; username?: string | null }, phone: string) {
    const nonce = await this.prisma.telegramLoginNonce.findFirst({ where: { purpose: "verify",
      telegramId: telegram.id, approvedAt: null, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" } });
    if (!nonce) return false;
    const normalizedPhone = `+${phone.replace(/\D/g, "")}`;
    const verification = await this.prisma.phoneVerification.create({ data: {
      phone: normalizedPhone, codeHash: hash(randomBytes(16).toString("hex")),
      verificationToken: randomBytes(32).toString("base64url"), channel: "telegram",
      telegramId: telegram.id, telegramUsername: telegram.username ?? null,
      verifiedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    } });
    await this.prisma.telegramLoginNonce.update({ where: { id: nonce.id },
      data: { approvedAt: new Date(), phoneVerificationId: verification.id } });
    return true;
  }

  async pollVerify(nonce: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.telegramLoginNonce.findUnique({ where: { nonceHash: hash(nonce) } });
      if (!row || row.purpose !== "verify" || row.expiresAt <= new Date() || row.consumedAt) return { status: "expired" as const };
      if (!row.approvedAt || !row.phoneVerificationId) return { status: "pending" as const };
      const consumed = await tx.telegramLoginNonce.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
      if (!consumed.count) return { status: "expired" as const };
      const verification = await tx.phoneVerification.findUnique({ where: { id: row.phoneVerificationId },
        select: { phone: true, verificationToken: true } });
      if (!verification?.verificationToken) return { status: "expired" as const };
      return { status: "verified" as const, phoneNumber: verification.phone, verificationToken: verification.verificationToken };
    });
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
