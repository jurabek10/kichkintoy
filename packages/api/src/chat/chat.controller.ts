import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { sendChatMessageInputSchema } from "@kichkintoy/shared";
import { SessionGuard, type RequestWithUser } from "../auth/session.guard";
import { ChatService, type ChatOwnerRole } from "./chat.service";
import { GeminiChatService } from "./gemini-chat.service";

/**
 * Streaming answer turn for the AI chatroom (parent or teacher). Separate from
 * the oRPC thread CRUD because assistant-ui consumes a token stream. Emits SSE
 * frames: {type:"delta",value}, {type:"tool",name}, {type:"done"}, {type:"error"}.
 * The owner role is derived from the session, which selects the scoped toolset.
 */
@Controller("chat")
@UseGuards(SessionGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly geminiChat: GeminiChatService,
  ) {}

  @Post("stream")
  async stream(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user!.id;
    const ownerRole = ownerRoleFor(req.user!);
    const input = sendChatMessageInputSchema.parse(body);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const send = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const turn = await this.chatService.beginTurn(
        userId,
        ownerRole,
        input.threadId,
        input.message,
        input.childId,
        input.appLanguage,
      );

      const toolTrace: string[] = [];
      let answer = "";

      for await (const event of this.geminiChat.streamAnswer({
        systemPrompt: turn.systemPrompt,
        history: turn.history,
        tools: turn.tools,
        executeTool: (name, args) => {
          toolTrace.push(name);
          return turn.executeTool(name, args);
        },
      })) {
        if (event.type === "text") {
          answer += event.value;
          send({ type: "delta", value: event.value });
        } else if (event.type === "tool") {
          send({ type: "tool", name: event.name });
        }
      }

      const finalText = answer.trim();
      await this.chatService.finishTurn(
        input.threadId,
        finalText.length > 0 ? finalText : fallbackAnswer(),
        toolTrace,
        turn.isFirstTurn,
        input.message,
      );

      send({ type: "done" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      send({ type: "error", message });
    } finally {
      res.end();
    }
  }
}

/** A teacher (even a dual parent+teacher) gets the teacher toolset; else parent. */
function ownerRoleFor(user: NonNullable<RequestWithUser["user"]>): ChatOwnerRole {
  return user.roles.some((role) => role.name === "teacher")
    ? "teacher"
    : "parent";
}

function fallbackAnswer(): string {
  return "I couldn't put an answer together just now. Please try asking again.";
}
