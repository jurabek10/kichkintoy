import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ChatLanguage,
  ChatThreadDetail,
  ChatThreadListResponse,
  ChatThreadSummary,
} from "@kichkintoy/shared";
import { PrismaService } from "../database/prisma.service";
import type { ChatMessage as PrismaChatMessage, ChatThread } from "@prisma/client";
import { ChatToolsService, type ChatScope } from "./chat-tools.service";
import type { ChatTurnMessage } from "./gemini-chat.service";

const DEFAULT_PAGE_SIZE = 20;
// How many prior turns to replay to the model (keeps latency/token cost bounded).
const HISTORY_WINDOW = 20;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly toolsService: ChatToolsService,
  ) {}

  // --- Thread CRUD (oRPC) ---

  async listThreads(
    userId: string,
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<ChatThreadListResponse> {
    const rows = await this.prisma.chatThread.findMany({
      where: { parentUserId: userId },
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const items = rows.slice(0, limit).map(toSummary);
    const nextCursor = rows.length > limit ? rows[limit].id : null;
    return { items, nextCursor };
  }

  async createThread(
    userId: string,
    requestedChildId?: string,
  ): Promise<ChatThreadSummary> {
    const scope = await this.toolsService.buildScope(userId, requestedChildId);
    const centerId = resolveCenterId(scope);
    const thread = await this.prisma.chatThread.create({
      data: {
        parentUserId: userId,
        childId: scope.childId,
        centerId,
        title: "New chat",
      },
    });
    return toSummary(thread);
  }

  async getThread(
    userId: string,
    threadId: string,
  ): Promise<ChatThreadDetail> {
    const thread = await this.requireOwnedThread(userId, threadId);
    const messages = await this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });
    return { ...toSummary(thread), messages: messages.map(toMessage) };
  }

  async renameThread(
    userId: string,
    threadId: string,
    title: string,
  ): Promise<ChatThreadSummary> {
    await this.requireOwnedThread(userId, threadId);
    const thread = await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { title },
    });
    return toSummary(thread);
  }

  async deleteThread(
    userId: string,
    threadId: string,
  ): Promise<{ success: boolean }> {
    await this.requireOwnedThread(userId, threadId);
    await this.prisma.chatThread.delete({ where: { id: threadId } });
    return { success: true };
  }

  // --- Streaming turn helpers (used by the SSE controller) ---

  async beginTurn(
    userId: string,
    threadId: string,
    userMessage: string,
    requestedChildId?: string,
    appLanguage?: ChatLanguage,
  ): Promise<{
    scope: ChatScope;
    history: ChatTurnMessage[];
    systemPrompt: string;
    isFirstTurn: boolean;
  }> {
    const thread = await this.requireOwnedThread(userId, threadId);
    const scope = await this.toolsService.buildScope(
      userId,
      requestedChildId ?? thread.childId ?? undefined,
    );

    const priorCount = await this.prisma.chatMessage.count({
      where: { threadId },
    });
    const isFirstTurn = priorCount === 0;

    await this.prisma.chatMessage.create({
      data: {
        threadId,
        role: "user",
        content: userMessage,
        language: detectLanguage(userMessage),
      },
    });
    // Persist the chosen child on the thread if it changed.
    if (scope.childId && scope.childId !== thread.childId) {
      await this.prisma.chatThread.update({
        where: { id: threadId },
        data: { childId: scope.childId },
      });
    }

    const recent = await this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_WINDOW,
    });
    const history: ChatTurnMessage[] = recent
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    return {
      scope,
      history,
      systemPrompt: buildSystemPrompt(scope, appLanguage ?? detectLanguage(userMessage)),
      isFirstTurn,
    };
  }

  async finishTurn(
    threadId: string,
    assistantText: string,
    toolTrace: string[],
    isFirstTurn: boolean,
    firstUserMessage: string,
  ): Promise<void> {
    await this.prisma.chatMessage.create({
      data: {
        threadId,
        role: "assistant",
        content: assistantText,
        language: detectLanguage(assistantText),
        toolTrace: toolTrace.length ? toolTrace : undefined,
      },
    });
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: {
        updatedAt: new Date(),
        ...(isFirstTurn ? { title: deriveTitle(firstUserMessage) } : {}),
      },
    });
  }

  private async requireOwnedThread(
    userId: string,
    threadId: string,
  ): Promise<ChatThread> {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException("Chat not found.");
    if (thread.parentUserId !== userId) {
      throw new ForbiddenException("Chat not found.");
    }
    return thread;
  }
}

function resolveCenterId(scope: ChatScope): string {
  const centerId =
    scope.children.find((c) => c.id === scope.childId)?.centerId ??
    scope.children.find((c) => c.centerId)?.centerId ??
    null;
  if (!centerId) {
    throw new BadRequestException(
      "No enrolled child found for this account yet.",
    );
  }
  return centerId;
}

function toSummary(thread: ChatThread): ChatThreadSummary {
  return {
    id: thread.id,
    title: thread.title,
    childId: thread.childId,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  };
}

function toMessage(m: PrismaChatMessage) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    language: (m.language as ChatLanguage | null) ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

function deriveTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim().replace(/\s+/g, " ");
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}…`;
}

const LANGUAGE_NAMES: Record<ChatLanguage, string> = {
  uz: "Uzbek",
  ru: "Russian",
  en: "English",
};

/** Best-effort language tag for stored metadata; the model handles reply language. */
function detectLanguage(text: string): ChatLanguage {
  if (/[Ѐ-ӿ]/.test(text)) return "ru";
  if (/[ʻʼʻʼ]|o['ʻ]|g['ʻ]/.test(text)) return "uz";
  return "en";
}

function buildSystemPrompt(scope: ChatScope, appLanguage: ChatLanguage): string {
  const childLine = scope.childName
    ? `You are helping the parent of a kindergarten child named ${scope.childName}.`
    : `You are helping a parent at the kindergarten.`;
  const siblings =
    scope.children.length > 1
      ? ` This parent has more than one child: ${scope.children
          .map((c) => c.firstName)
          .join(", ")}. The current conversation is about ${
          scope.childName ?? "their child"
        }.`
      : "";
  const fallbackLang = LANGUAGE_NAMES[appLanguage] ?? "Uzbek";

  return `You are Kichkintoy Assistant, a warm, trustworthy helper for parents of a kindergarten (bog'cha). ${childLine}${siblings}

LANGUAGE — HIGHEST PRIORITY, READ FIRST
- Detect the language of the parent's MOST RECENT message: Uzbek, Russian, or English.
- Write your ENTIRE reply in that same language. English message -> reply in English. Russian message -> reply in Russian. Uzbek message -> reply in Uzbek.
- This overrides everything, including the app's interface language. Do NOT default to Uzbek. Do NOT switch languages mid-answer.
- Only if the latest message is too short to tell (e.g. a lone name, "ok", "?"), reply in ${fallbackLang}.
- Keep proper nouns (child name, teacher name, event/album titles) exactly as stored; never translate them.

WHAT YOU DO
- Answer the parent's questions about THEIR child and the center using ONLY the tools provided.
- Call tools to fetch real data before answering. Never invent facts, names, dates, or numbers.
- If a tool returns no data, say so plainly (e.g. there is no report for that day yet).
- Be warm and concise. Speak like a caring teacher, not a robot. No medical advice.

BE HELPFUL — DON'T MAKE THE PARENT DO THE WORK
- Parents rarely know exact dates. NEVER ask the parent to pick a specific date or narrow a time range before you answer. Choose the right window, call the tool, and answer.
- Every data tool (reports, meals, attendance, medications, pickups, calendar, ...) accepts a time window: pass period ("day"/"week"/"month"/"year"/"all"), a specific month (e.g. "2026-06"), or from/to. Use it to answer "this month", "this year", or "so far" questions directly — do not fall back to a single day.
- Aggregate when asked: e.g. "which meal was served most in June" -> getMeals with month "2026-06", then count by meal; "how is my child developing / strengths and weaknesses" -> getDevelopmentSummary with period "all".
- "What medicine has my child taken (until now)" -> getMedications with NO date to get the full history, and summarise all of it.
- Only ask a clarifying question when answering is genuinely impossible. Otherwise answer first; you may add "tell me a specific day if you want more detail" at the end.

SCOPE
- You CAN discuss: this parent's own child (including their birthday, age, reports, attendance, meals, medication, photos); general class information (class name, age group, the teacher(s), and how many children are in the class as a count); and general center information (name, phone, address, notices, events, meals, holidays).
- You must NEVER reveal any OTHER child's name, birthday, photos, health, attendance, or any personal detail. For class size, give only a number — never a roster. The parent's OWN child's birthday is fine; other children's birthdays are not.
- If asked about other children's private details, staff private matters, or center finances, gently decline and offer what you can help with instead.

TOOL GUIDANCE
- "when is my child's birthday", age, class/center -> getChildProfile
- teacher's name, how many children in the class, age group -> getClassInfo
- center phone / address / general info -> getCenterInfo
- "how was my child today" -> getDailyReport
- "strengths / weaknesses / how is my child developing" -> getDevelopmentSummary (period "all")
- "this week/month" report recap -> listReports or getDevelopmentSummary
- events/holidays/"school tomorrow" or "events this month/year" -> getCalendarEvents
- missed notices -> listNotices(unreadOnly)
- meals (today or over a month/year) -> getMeals; medication -> getMedications; pick-up times -> getPickups; documents/forms -> getDocuments; photos -> listAlbums; attendance -> getAttendance
- Combine tools when a question spans topics. Today's date is ${new Date()
    .toISOString()
    .slice(0, 10)}.`;
}
