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
  metadata?: Prisma.InputJsonValue | null;
  dedupeKey?: string | null;
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
    const createRows = (client: Prisma.TransactionClient) =>
      Promise.all(
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
              dedupeKey:
                channel === "in_app" ? (input.dedupeKey ?? null) : null,
              sentAt: channel === "in_app" ? new Date() : null,
            },
          }),
        ),
      );

    let rows;
    try {
      rows = tx
        ? await createRows(tx)
        : await this.prisma.$transaction((transaction) =>
            createRows(transaction),
          );
    } catch (error) {
      if (input.dedupeKey && isUniqueConstraintError(error)) return [];
      throw error;
    }

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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
