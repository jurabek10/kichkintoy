import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { EskizSmsService } from "../auth/eskiz-sms.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

export type NotificationChannel = "in_app" | "push" | "sms";

export type EnqueueNotificationInput = {
  userId: string;
  notificationType: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  priority?: "normal" | "high" | "urgent";
  metadata?: Prisma.InputJsonObject | null;
  channels: NotificationChannel[];
  smsPhoneNumber?: string | null;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eskiz: EskizSmsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async enqueue(
    input: EnqueueNotificationInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const rows = await Promise.all(
      input.channels.map((channel) =>
        client.notification.create({
          data: {
            userId: input.userId,
            notificationType: input.notificationType,
            title: input.title,
            body: input.body ?? null,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            channel,
            status: channel === "in_app" ? "delivered" : "pending",
            priority: input.priority ?? "normal",
            metadata: input.metadata ?? Prisma.JsonNull,
            sentAt: channel === "in_app" ? new Date() : null,
          },
        }),
      ),
    );

    await Promise.all(
      rows
        .filter((row) => row.channel === "in_app")
        .map((row) => this.realtime.publishNotification(row)),
    );

    return rows;
  }

  async deliverSms(phoneNumber: string, message: string) {
    try {
      return await this.eskiz.sendMessage(phoneNumber, message);
    } catch (error) {
      this.logger.error(
        `Failed to deliver SMS to ${phoneNumber}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { provider: "eskiz", sent: false };
    }
  }
}
