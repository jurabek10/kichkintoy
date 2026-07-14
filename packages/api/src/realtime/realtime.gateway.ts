import { Injectable, Logger } from "@nestjs/common";
import type { Server } from "node:http";
import type { IncomingMessage } from "node:http";
import type { Notification } from "@prisma/client";
import type { ServerRealtimeMessage } from "@kichkintoy/shared";
import type { DirectMessage } from "@kichkintoy/shared";
import { WebSocket, WebSocketServer } from "ws";
import { PrismaService } from "../database/prisma.service";
import { RealtimeService } from "./realtime.service";

@Injectable()
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly socketsByUser = new Map<string, Set<WebSocket>>();
  private readonly alive = new Map<WebSocket, boolean>();
  private server: WebSocketServer | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly prisma: PrismaService,
  ) {}

  attach(server: Server) {
    if (this.server) return;

    this.server = new WebSocketServer({
      server,
      path: "/ws",
      maxPayload: 64 * 1024,
    });

    this.server.on("connection", (socket, request) => {
      void this.handleConnection(socket, request);
    });

    this.heartbeatTimer = setInterval(() => this.pingSockets(), 30_000);
    this.logger.log("Realtime WebSocket gateway listening on /ws.");
  }

  async publishNotification(notification: Notification) {
    if (notification.channel !== "in_app") return;

    const message: ServerRealtimeMessage = {
      type: "notification.created",
      payload: {
        notificationId: notification.id,
        notificationType: notification.notificationType,
        title: notification.title,
        body: notification.body,
        entityType: notification.entityType,
        entityId: notification.entityId,
        priority: this.normalizePriority(notification.priority),
        createdAt: notification.createdAt.toISOString(),
        queryKeys: this.queryHintsFor(notification),
      },
    };

    this.sendToUser(notification.userId, message);

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId: notification.userId,
        channel: "in_app",
        readAt: null,
      },
    });

    this.sendToUser(notification.userId, {
      type: "notification.count_updated",
      payload: { unreadCount },
    });
  }

  async publishUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, channel: "in_app", readAt: null },
    });
    this.sendToUser(userId, {
      type: "notification.count_updated",
      payload: { unreadCount },
    });
  }

  publishMessageCreated(userIds: string[], threadId: string, message: DirectMessage) {
    this.sendToUsers(userIds, { type: "message.created", payload: { threadId, message } });
  }

  publishMessageDeleted(userIds: string[], threadId: string, message: DirectMessage) {
    this.sendToUsers(userIds, { type: "message.deleted", payload: { threadId, message } });
  }

  publishMessageUpdated(userIds: string[], threadId: string, message: DirectMessage) {
    this.sendToUsers(userIds, { type: "message.updated", payload: { threadId, message } });
  }

  publishThreadRead(userIds: string[], threadId: string, userId: string, lastReadAt: string) {
    this.sendToUsers(userIds, {
      type: "thread.read",
      payload: { threadId, userId, lastReadAt },
    });
  }

  private async handleConnection(socket: WebSocket, request: IncomingMessage) {
    try {
      const url = new URL(request.url ?? "", "http://localhost");
      const ticket = url.searchParams.get("ticket");

      if (!ticket) {
        socket.close(1008, "Missing realtime ticket.");
        return;
      }

      const { userId } = await this.realtime.consumeTicket(ticket);
      this.trackSocket(userId, socket);
      this.send(socket, {
        type: "connection.ready",
        payload: { connectedAt: new Date().toISOString() },
      });
    } catch (error) {
      this.logger.warn(
        `Rejected realtime connection: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      socket.close(1008, "Invalid realtime ticket.");
    }
  }

  private trackSocket(userId: string, socket: WebSocket) {
    const sockets = this.socketsByUser.get(userId) ?? new Set<WebSocket>();
    sockets.add(socket);
    this.socketsByUser.set(userId, sockets);
    this.alive.set(socket, true);

    socket.on("pong", () => this.alive.set(socket, true));
    socket.on("close", () => {
      sockets.delete(socket);
      this.alive.delete(socket);
      if (sockets.size === 0) this.socketsByUser.delete(userId);
    });
  }

  private sendToUser(userId: string, message: ServerRealtimeMessage) {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) return;

    for (const socket of sockets) {
      this.send(socket, message);
    }
  }

  private sendToUsers(userIds: string[], message: ServerRealtimeMessage) {
    for (const userId of new Set(userIds)) this.sendToUser(userId, message);
  }

  private send(socket: WebSocket, message: ServerRealtimeMessage) {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
  }

  private pingSockets() {
    for (const socket of this.alive.keys()) {
      if (!this.alive.get(socket)) {
        socket.terminate();
        continue;
      }

      this.alive.set(socket, false);
      socket.ping();
    }
  }

  private normalizePriority(priority: string) {
    if (priority === "high" || priority === "urgent") return priority;
    return "normal";
  }

  private queryHintsFor(notification: Notification) {
    const hints: Array<{ group: string; id?: string }> = [
      { group: "notifications" },
    ];

    const source = `${notification.notificationType}:${notification.entityType ?? ""}`;
    const entityId = notification.entityId ?? undefined;

    if (source.includes("report")) hints.push({ group: "reports", id: entityId });
    if (source.includes("notice")) hints.push({ group: "notices", id: entityId });
    if (source.includes("album")) hints.push({ group: "albums", id: entityId });
    if (source.includes("calendar")) {
      hints.push({ group: "calendar", id: entityId });
    }
    if (source.includes("meal")) hints.push({ group: "meals", id: entityId });
    if (source.includes("medication")) {
      hints.push({ group: "medications", id: entityId });
    }
    if (source.includes("pickup")) hints.push({ group: "pickups", id: entityId });
    if (source.includes("attendance")) {
      hints.push({ group: "attendance", id: entityId });
    }
    if (source.includes("student_document")) {
      hints.push({ group: "studentDocuments", id: entityId });
    }
    if (source.includes("join") || source.includes("membership")) {
      hints.push({ group: "director" });
    }

    return hints;
  }
}
