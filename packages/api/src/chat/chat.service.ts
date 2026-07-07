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
import {
  ChatToolsService,
  type ChatScope,
  type ToolDeclaration,
} from "./chat-tools.service";
import {
  TeacherChatToolsService,
  type TeacherChatScope,
} from "./teacher-chat-tools.service";
import {
  DirectorChatToolsService,
  type DirectorChatScope,
} from "./director-chat-tools.service";
import type { ChatTurnMessage } from "./gemini-chat.service";

const DEFAULT_PAGE_SIZE = 20;
// How many prior turns to replay to the model (keeps latency/token cost bounded).
const HISTORY_WINDOW = 20;

/** Which scoped toolset a thread uses. */
export type ChatOwnerRole = "parent" | "teacher" | "director";

/** Everything the SSE controller needs to run one answer turn, role-agnostic. */
export type ChatTurn = {
  history: ChatTurnMessage[];
  systemPrompt: string;
  isFirstTurn: boolean;
  tools: ToolDeclaration[];
  executeTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<unknown>;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parentTools: ChatToolsService,
    private readonly teacherTools: TeacherChatToolsService,
    private readonly directorTools: DirectorChatToolsService,
  ) {}

  // --- Thread CRUD (oRPC) ---

  async listThreads(
    userId: string,
    ownerRole: ChatOwnerRole,
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<ChatThreadListResponse> {
    const rows = await this.prisma.chatThread.findMany({
      where: { ownerUserId: userId, ownerRole },
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
    ownerRole: ChatOwnerRole,
    requestedChildId?: string,
  ): Promise<ChatThreadSummary> {
    const { centerId, childId } = await this.resolveOwnerContext(
      userId,
      ownerRole,
      requestedChildId,
    );
    const thread = await this.prisma.chatThread.create({
      data: {
        ownerUserId: userId,
        ownerRole,
        childId,
        centerId,
        title: "New chat",
      },
    });
    return toSummary(thread);
  }

  async getThread(
    userId: string,
    ownerRole: ChatOwnerRole,
    threadId: string,
  ): Promise<ChatThreadDetail> {
    const thread = await this.requireOwnedThread(userId, ownerRole, threadId);
    const messages = await this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });
    return { ...toSummary(thread), messages: messages.map(toMessage) };
  }

  async renameThread(
    userId: string,
    ownerRole: ChatOwnerRole,
    threadId: string,
    title: string,
  ): Promise<ChatThreadSummary> {
    await this.requireOwnedThread(userId, ownerRole, threadId);
    const thread = await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { title },
    });
    return toSummary(thread);
  }

  async deleteThread(
    userId: string,
    ownerRole: ChatOwnerRole,
    threadId: string,
  ): Promise<{ success: boolean }> {
    await this.requireOwnedThread(userId, ownerRole, threadId);
    await this.prisma.chatThread.delete({ where: { id: threadId } });
    return { success: true };
  }

  // --- Streaming turn helpers (used by the SSE controller) ---

  async beginTurn(
    userId: string,
    ownerRole: ChatOwnerRole,
    threadId: string,
    userMessage: string,
    requestedChildId?: string,
    appLanguage?: ChatLanguage,
  ): Promise<ChatTurn> {
    const thread = await this.requireOwnedThread(userId, ownerRole, threadId);

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

    const language = appLanguage ?? detectLanguage(userMessage);

    let turn: Pick<ChatTurn, "systemPrompt" | "tools" | "executeTool">;
    if (ownerRole === "teacher") {
      const scope = await this.teacherTools.buildScope(userId);
      turn = {
        systemPrompt: buildTeacherSystemPrompt(scope, language),
        tools: this.teacherTools.getToolDeclarations(),
        executeTool: (name, args) =>
          this.teacherTools.execute(scope, name, args),
      };
    } else if (ownerRole === "director") {
      const scope = await this.directorTools.buildScope(userId);
      if (!scope) {
        throw new BadRequestException("You do not run a center yet.");
      }
      turn = {
        systemPrompt: buildDirectorSystemPrompt(scope, language),
        tools: this.directorTools.getToolDeclarations(),
        executeTool: (name, args) =>
          this.directorTools.execute(scope, name, args),
      };
    } else {
      const scope = await this.parentTools.buildScope(
        userId,
        requestedChildId ?? thread.childId ?? undefined,
      );
      // Persist the chosen child on the thread if it changed.
      if (scope.childId && scope.childId !== thread.childId) {
        await this.prisma.chatThread.update({
          where: { id: threadId },
          data: { childId: scope.childId },
        });
      }
      turn = {
        systemPrompt: buildParentSystemPrompt(scope, language),
        tools: this.parentTools.getToolDeclarations(),
        executeTool: (name, args) =>
          this.parentTools.execute(scope, name, args),
      };
    }

    const recent = await this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_WINDOW,
    });
    const history: ChatTurnMessage[] = recent
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    return { history, isFirstTurn, ...turn };
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

  /** Resolve the tenant center (and, for parents, the child) for a new thread. */
  private async resolveOwnerContext(
    userId: string,
    ownerRole: ChatOwnerRole,
    requestedChildId?: string,
  ): Promise<{ centerId: string; childId: string | null }> {
    if (ownerRole === "teacher") {
      const scope = await this.teacherTools.buildScope(userId);
      if (!scope.centerId) {
        throw new BadRequestException(
          "You have no classes assigned yet.",
        );
      }
      return { centerId: scope.centerId, childId: null };
    }
    if (ownerRole === "director") {
      const scope = await this.directorTools.buildScope(userId);
      if (!scope) {
        throw new BadRequestException("You do not run a center yet.");
      }
      return { centerId: scope.centerId, childId: null };
    }
    const scope = await this.parentTools.buildScope(userId, requestedChildId);
    return { centerId: resolveParentCenterId(scope), childId: scope.childId };
  }

  private async requireOwnedThread(
    userId: string,
    ownerRole: ChatOwnerRole,
    threadId: string,
  ): Promise<ChatThread> {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException("Chat not found.");
    if (thread.ownerUserId !== userId || thread.ownerRole !== ownerRole) {
      throw new ForbiddenException("Chat not found.");
    }
    return thread;
  }
}

function resolveParentCenterId(scope: ChatScope): string {
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

function buildParentSystemPrompt(
  scope: ChatScope,
  appLanguage: ChatLanguage,
): string {
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
- Combine tools when a question spans topics. Today's date is ${todayForPrompt()}.`;
}

function buildTeacherSystemPrompt(
  scope: TeacherChatScope,
  appLanguage: ChatLanguage,
): string {
  const fallbackLang = LANGUAGE_NAMES[appLanguage] ?? "Uzbek";
  const classList = scope.classes.length
    ? scope.classes.map((c) => c.name).join(", ")
    : "no classes yet";

  return `You are Kichkintoy Assistant for a kindergarten (bog'cha) TEACHER. You help her with HER classes and the children in them, and with general center information. Her classes: ${classList}.

LANGUAGE — HIGHEST PRIORITY, READ FIRST
- Detect the language of the teacher's MOST RECENT message: Uzbek, Russian, or English.
- Write your ENTIRE reply in that same language. English -> English, Russian -> Russian, Uzbek -> Uzbek.
- This overrides everything, including the app's interface language. Do NOT default to Uzbek. Do NOT switch languages mid-answer.
- Only if the latest message is too short to tell, reply in ${fallbackLang}.
- Keep proper nouns (child names, class names, event/album titles) exactly as stored; never translate them.

WHAT YOU DO
- Answer using ONLY the tools. Call tools to fetch real data before answering. Never invent names, dates, counts, or facts.
- If a tool returns no data, say so plainly. Be warm, direct and concise. No medical advice.

BE DIRECT — DON'T INTERROGATE THE TEACHER
- NEVER ask her to name a child or pick a date when the question is answerable across the class or a time window. Choose the window, call the tool, and answer.
- "Which child has the most absences so far / until today" -> getAttendance at CLASS level with period "all" (or the span she named), then read perChild (already sorted by most absences) and answer the ranking directly.
- "Who is absent today / who hasn't arrived" -> getAttendance for period "day" and read today's statuses.
- "Which reports are still unwritten / who has no report today" -> getDailyReports with the class (and today's date) and list the children whose report is null.
- "Whose medication is due today" -> getMedications for today. "Who is picked up early today" -> getPickups for today.
- When she names ONE child, call findChild first to get the childId, then the per-child tool (getChildProfile / getDevelopmentSummary / getDailyReports).
- Every data tool accepts a window: period ("day"/"week"/"month"/"year"/"all"), a month ("2026-06"), or from/to. Use it for "this month/this year/so far" — do not fall back to a single day.

SCOPE
- You CAN discuss: her assigned classes and every child enrolled in them (names, ages, gender, guardians, reports, attendance, meals, medication, pick-ups, documents, albums); notices/events/meals for her classes; pending join requests for her classes; and general center info (name, phone, address, the director's name, and the total number of classes and children in the center).
- You must NEVER reveal children or classes she does NOT teach, other staff's private matters, salaries, tuition, or any center finances. Decline gently and offer what you can help with instead.

- Combine tools when a question spans topics. Today's date is ${todayForPrompt()}.`;
}

function buildDirectorSystemPrompt(
  scope: DirectorChatScope,
  appLanguage: ChatLanguage,
): string {
  const fallbackLang = LANGUAGE_NAMES[appLanguage] ?? "Uzbek";
  const centerLine = scope.centerName
    ? `You help them run their center, ${scope.centerName}.`
    : `You help them run their kindergarten center.`;

  return `You are Kichkintoy Assistant for a kindergarten (bog'cha) DIRECTOR. ${centerLine} You cover the WHOLE center — every class, every child, every teacher, operations, and tuition/finances.

LANGUAGE — HIGHEST PRIORITY, READ FIRST
- Detect the language of the director's MOST RECENT message: Uzbek, Russian, or English.
- Write your ENTIRE reply in that same language. English -> English, Russian -> Russian, Uzbek -> Uzbek.
- This overrides everything, including the app's interface language. Do NOT default to Uzbek. Do NOT switch languages mid-answer.
- Only if the latest message is too short to tell, reply in ${fallbackLang}.
- Keep proper nouns (child/class/teacher/center names) exactly as stored; never translate them. Format money as the raw figure with the currency (e.g. 1.500.000 so'm).

WHAT YOU DO
- Answer using ONLY the tools. Call tools to fetch real data before answering. Never invent names, dates, counts, or money amounts.
- You are READ-ONLY. You can report and analyze, but you CANNOT approve requests, send or revoke invitations, edit records, issue invoices, or change anything. If asked to DO something, say you can't act, and point them to the relevant dashboard page.
- Be direct. NEVER ask which class/child/date when the question is answerable center-wide — choose the scope, call the tool, and answer.
- "How are we doing / today's snapshot / occupancy / collection rate" -> getCenterOverview.
- "Which class has the most unpaid tuition" -> getTuition (no args), read per-class unpaid, rank.
- "How many absent today / who is most absent" -> getAttendance (period 'day' or 'all'), aggregate center-wide.
- "Which classes have unwritten reports today" -> getReports with today's date and no classId (per-class board).
- When a name is given, call findChild / findClass / findStaff first, then the detail tool.
- Every data tool accepts a window (period/month/from/to). Use it for "this month/year/so far".

SCOPE
- You CAN discuss anything in THIS center: children, classes, teachers, reports, attendance, meals, medication, pick-ups, documents, albums, notices, calendar, join requests, invitations, occupancy, and tuition/finance.
- You must NEVER reveal or reach another center or organization. Decline gently and offer what you can help with in this center.

- Combine tools when a question spans topics. Today's date is ${todayForPrompt()}.`;
}

function todayForPrompt(): string {
  return new Date().toISOString().slice(0, 10);
}
