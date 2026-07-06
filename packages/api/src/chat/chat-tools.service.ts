import { Injectable } from "@nestjs/common";
import { AttendanceService } from "../attendance/attendance.service";
import { AlbumsService } from "../albums/albums.service";
import { CalendarService } from "../calendar/calendar.service";
import { PrismaService } from "../database/prisma.service";
import { MealsService } from "../meals/meals.service";
import { MedicationsService } from "../medications/medications.service";
import { NoticesService } from "../notices/notices.service";
import { PickupsService } from "../pickups/pickups.service";
import { ProfileService } from "../profile/profile.service";
import { ReportsService } from "../reports/reports.service";

/**
 * A Gemini function declaration (subset of the OpenAPI schema Gemini accepts).
 */
export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

/**
 * Per-request scope for a parent chat turn: the parent's own children, and the
 * single child the thread is about (if chosen / resolvable).
 */
export type ChatScope = {
  userId: string;
  childId: string | null;
  childName: string | null;
  childDob: string | null;
  centerId: string | null;
  children: Array<{
    id: string;
    firstName: string;
    className: string | null;
    centerId: string | null;
  }>;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromTodayIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The tools the parent chatroom AI may call. Every tool delegates to an
 * existing parent-facing service, each of which self-scopes to the parent's own
 * children (parentAccess / requireGuardian). The AI never gets a raw DB handle,
 * and no other family's data is reachable through any tool.
 */
@Injectable()
export class ChatToolsService {
  constructor(
    private readonly profileService: ProfileService,
    private readonly reportsService: ReportsService,
    private readonly attendanceService: AttendanceService,
    private readonly noticesService: NoticesService,
    private readonly calendarService: CalendarService,
    private readonly mealsService: MealsService,
    private readonly medicationsService: MedicationsService,
    private readonly albumsService: AlbumsService,
    private readonly pickupsService: PickupsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Resolve the parent's children and the effective child for this thread. */
  async buildScope(
    userId: string,
    requestedChildId?: string,
  ): Promise<ChatScope> {
    const children = await this.profileService.listChildren(userId);
    const resolved =
      (requestedChildId
        ? children.find((c) => c.id === requestedChildId)
        : undefined) ??
      children.find((c) => c.isPrimary) ??
      children[0];

    return {
      userId,
      childId: resolved?.id ?? null,
      childName: resolved?.firstName ?? null,
      childDob: resolved?.dateOfBirth ?? null,
      centerId: resolved?.centerId ?? children.find((c) => c.centerId)?.centerId ?? null,
      children: children.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        className: c.className,
        centerId: c.centerId,
      })),
    };
  }

  getToolDeclarations(): ToolDeclaration[] {
    const periodProp = {
      type: "string",
      enum: ["day", "week", "month"],
      description: "Time range to look back over. Defaults to week.",
    };
    return [
      {
        name: "getChildProfile",
        description:
          "Get THIS parent's own child's first name, birthday (date of birth), age, class and center. Use for 'when is my child's birthday', age, or basic who/where context.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "getClassInfo",
        description:
          "Get general, non-private info about the child's class: class name, age group, the teacher(s) assigned, and how many children are in the class (a count only, never other children's names or details).",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "getCenterInfo",
        description:
          "Get general public info about the kindergarten center: name, phone, address, region/district. Info any parent at the center may know.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "getDailyReport",
        description:
          "Get the child's daily report for a specific day (mood, meals, sleep, activities, class participation, health note). Use for questions about a specific day, e.g. 'how was my child today'.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Day in YYYY-MM-DD. Defaults to today.",
            },
          },
          required: [],
        },
      },
      {
        name: "listReports",
        description:
          "List the child's recent published daily reports. Use for 'this week/month' summaries and development questions.",
        parameters: {
          type: "object",
          properties: { period: periodProp },
          required: [],
        },
      },
      {
        name: "getDevelopmentSummary",
        description:
          "Get the child's aggregated development signals (strengths, needs-practice, participation, mood) across a period. Use for 'how is my child developing' questions.",
        parameters: {
          type: "object",
          properties: { period: periodProp },
          required: [],
        },
      },
      {
        name: "getAttendance",
        description:
          "Get the child's attendance (present/absent days) over a date range.",
        parameters: {
          type: "object",
          properties: {
            from: { type: "string", description: "Start day YYYY-MM-DD." },
            to: { type: "string", description: "End day YYYY-MM-DD." },
          },
          required: [],
        },
      },
      {
        name: "listNotices",
        description:
          "List notices the parent has received. Set unreadOnly to focus on what they may have missed.",
        parameters: {
          type: "object",
          properties: {
            unreadOnly: {
              type: "boolean",
              description: "Only notices not yet confirmed/read.",
            },
          },
          required: [],
        },
      },
      {
        name: "getUpcomingEvents",
        description:
          "Get upcoming calendar events for the child's class/center (holidays, meetings, parties).",
        parameters: {
          type: "object",
          properties: {
            withinDays: {
              type: "number",
              description: "Look-ahead window in days. Defaults to 14.",
            },
          },
          required: [],
        },
      },
      {
        name: "getMeals",
        description: "Get the meal menu for a day.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Day YYYY-MM-DD. Defaults to today.",
            },
          },
          required: [],
        },
      },
      {
        name: "getMedications",
        description:
          "Get the child's medication requests/schedule, optionally for a specific day.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Day YYYY-MM-DD." },
          },
          required: [],
        },
      },
      {
        name: "listAlbums",
        description:
          "List photo albums the child appears in (titles and counts, not raw images).",
        parameters: { type: "object", properties: {}, required: [] },
      },
    ];
  }

  /**
   * Execute a tool by name with model-supplied args, always under the given
   * scope. Unknown tools and out-of-scope children are rejected.
   */
  async execute(
    scope: ChatScope,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const { userId } = scope;
    const childId = scope.childId ?? undefined;
    const period = normalizePeriod(args.period);

    switch (name) {
      case "getChildProfile":
        return {
          child: scope.childName,
          birthday: scope.childDob,
          age: scope.childDob ? ageFromDob(scope.childDob) : null,
          className:
            scope.children.find((c) => c.id === scope.childId)?.className ??
            null,
          allChildren: scope.children.map((c) => c.firstName),
        };

      case "getClassInfo":
        return this.getClassInfo(scope);

      case "getCenterInfo":
        return this.getCenterInfo(scope);

      case "getDailyReport": {
        if (!childId) return { note: "No child on file." };
        const date =
          typeof args.date === "string" ? args.date : todayIso();
        const reports = await this.reportsService.listParentReports(
          userId,
          childId,
        );
        const match = (reports as Array<{ reportDate?: string }>).find(
          (r) => r.reportDate === date,
        );
        return match ?? { note: `No report for ${date}.`, date };
      }

      case "listReports": {
        if (!childId) return { note: "No child on file." };
        const reports = await this.reportsService.listParentReports(
          userId,
          childId,
        );
        return { period, reports: limit(reports, period) };
      }

      case "getDevelopmentSummary": {
        if (!childId) return { note: "No child on file." };
        const reports = await this.reportsService.listParentReports(
          userId,
          childId,
        );
        return {
          period,
          child: scope.childName,
          reports: limit(reports, period),
          note: "Synthesize strengths, needs-practice, participation and mood trends from these reports.",
        };
      }

      case "getAttendance":
        return this.attendanceService.listForParent(userId, {
          childId,
          from: typeof args.from === "string" ? args.from : undefined,
          to: typeof args.to === "string" ? args.to : undefined,
        });

      case "listNotices": {
        const notices = await this.noticesService.listForParent(
          userId,
          childId,
        );
        return notices;
      }

      case "getUpcomingEvents": {
        const withinDays =
          typeof args.withinDays === "number" ? args.withinDays : 14;
        return this.calendarService.listForParent(userId, {
          childId,
          from: todayIso(),
          to: daysFromTodayIso(withinDays),
        });
      }

      case "getMeals":
        return this.mealsService.listForParent(
          userId,
          childId,
          typeof args.date === "string" ? args.date : todayIso(),
        );

      case "getMedications":
        return this.medicationsService.listForParent(userId, {
          childId,
          date: typeof args.date === "string" ? args.date : undefined,
        });

      case "listAlbums":
        return this.albumsService.listForParent(userId, childId);

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  /**
   * General, non-private info about the parent's own child's class: the class
   * name/age group, assigned teacher(s), and a headcount. Never returns other
   * children's names, birthdays, or any personal detail — only a count.
   */
  private async getClassInfo(scope: ChatScope): Promise<unknown> {
    if (!scope.childId) return { note: "No child on file." };

    const enrollment = await this.prisma.childEnrollment.findFirst({
      where: {
        childId: scope.childId,
        enrollmentStatus: "active",
        classId: { not: null },
      },
      include: {
        class: {
          include: {
            teacherClassAssignments: {
              where: { endedAt: null },
              include: { teacherUser: { select: { fullName: true } } },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    if (!enrollment?.class) {
      return { note: "This child is not assigned to a class yet." };
    }

    const childCount = await this.prisma.childEnrollment.count({
      where: { classId: enrollment.classId, enrollmentStatus: "active" },
    });

    return {
      className: enrollment.class.name,
      ageGroup: enrollment.class.ageGroup,
      teachers: enrollment.class.teacherClassAssignments.map(
        (a) => a.teacherUser.fullName,
      ),
      childCount,
      note: "childCount is a headcount only. Do not reveal any other child's name or personal details.",
    };
  }

  /** General public center info any parent may know. */
  private async getCenterInfo(scope: ChatScope): Promise<unknown> {
    if (!scope.centerId) return { note: "No center on file." };
    const center = await this.prisma.center.findUnique({
      where: { id: scope.centerId },
      select: {
        name: true,
        phone: true,
        address: true,
        region: true,
        district: true,
        facilityType: true,
      },
    });
    return center ?? { note: "Center not found." };
  }
}

/** Whole years between a date-of-birth ISO string and today. */
function ageFromDob(dob: string): number | null {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function normalizePeriod(value: unknown): "day" | "week" | "month" {
  return value === "day" || value === "month" ? value : "week";
}

/** Trim a report list to a sensible count for the period to bound token cost. */
function limit<T>(items: T[], period: "day" | "week" | "month"): T[] {
  const max = period === "day" ? 1 : period === "week" ? 7 : 31;
  return items.slice(0, max);
}
