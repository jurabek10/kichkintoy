import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { sendChatMessageInputSchema } from "@kichkintoy/shared";
import { SessionGuard, type RequestWithUser } from "../auth/session.guard";
import { ChatService } from "./chat.service";
import { ChatToolsService } from "./chat-tools.service";
import { GeminiChatService } from "./gemini-chat.service";

/**
 * Streaming answer turn for the parent chatroom. Separate from the oRPC thread
 * CRUD because assistant-ui consumes a token stream. Emits newline-delimited SSE
 * frames: {type:"delta",value}, {type:"tool",name}, {type:"done"}, {type:"error"}.
 */
@Controller("parent/chat")
@UseGuards(SessionGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly toolsService: ChatToolsService,
    private readonly geminiChat: GeminiChatService,
  ) {}

  @Post("stream")
  async stream(
    @Req() req: RequestWithUser,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user!.id;
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
        tools: this.toolsService.getToolDeclarations(),
        executeTool: (name, args) => {
          toolTrace.push(name);
          return this.toolsService.execute(turn.scope, name, args);
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
        finalText.length > 0
          ? finalText
          : fallbackAnswer(),
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

function fallbackAnswer(): string {
  return "I couldn't put an answer together just now. Please try asking again.";
}
