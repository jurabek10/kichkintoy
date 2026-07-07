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
import { StudentDocumentsService } from "../student-documents/student-documents.service";
import {
  ageFromDob,
  daysFromTodayIso,
  filterByDate,
  hasRangeArgs,
  limit,
  normalizePeriod,
  resolveRange,
  todayIso,
} from "./chat-range.util";

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
    private readonly studentDocumentsService: StudentDocumentsService,
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
      enum: ["day", "week", "month", "year", "all"],
      description:
        "Named time range: 'day' (today), 'week' (last 7 days), 'month' (this calendar month), 'year' (this calendar year), or 'all' (everything to date). Use this for questions like 'this month' or 'this year'. Defaults to month.",
    };
    // Reusable window params so any period question (month/year/specific day)
    // can be answered without asking the parent to pick an exact date.
    const rangeProps = {
      period: periodProp,
      month: {
        type: "string",
        description: "A specific calendar month as YYYY-MM (e.g. 2026-06 for June).",
      },
      from: { type: "string", description: "Explicit start day YYYY-MM-DD." },
      to: { type: "string", description: "Explicit end day YYYY-MM-DD." },
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
          "Get the child's aggregated development signals (strengths, needs-practice, participation, mood) across a period. Use for 'how is my child developing' and 'what is he good at / what needs practice' questions. When the parent asks generally (no time range), pass period 'all' to cover every report to date — do NOT ask the parent to pick a date.",
        parameters: {
          type: "object",
          properties: { period: periodProp },
          required: [],
        },
      },
      {
        name: "getAttendance",
        description:
          "Get the child's attendance (present/absent days). Pass a period ('month', 'year', ...), a specific month, or explicit from/to to cover any span. Never ask the parent for an exact date.",
        parameters: {
          type: "object",
          properties: { ...rangeProps },
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
        name: "getCalendarEvents",
        description:
          "Get calendar events for the child's class/center (holidays, meetings, parties). By default returns upcoming events; pass a period ('month', 'year'), a specific month, or from/to to get events across any span, including past ones. Use this for 'what events were there this month/year' as well as 'is there school tomorrow'.",
        parameters: {
          type: "object",
          properties: {
            ...rangeProps,
            withinDays: {
              type: "number",
              description:
                "Upcoming look-ahead window in days (used only when no period/month/from/to is given). Defaults to 14.",
            },
          },
          required: [],
        },
      },
      {
        name: "getMeals",
        description:
          "Get the meal menu. With no arguments returns today's menu. Pass a period ('month', 'year'), a specific month, or from/to to get EVERY meal served over that span — use this to answer aggregate questions like 'which meal was served most in June'. Never ask the parent to pick one day for a month question.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "A single day YYYY-MM-DD. Defaults to today.",
            },
            ...rangeProps,
          },
          required: [],
        },
      },
      {
        name: "getMedications",
        description:
          "Get the child's medication requests/records. With NO arguments, returns the FULL medication history to date — use this for 'what medicine has my child taken / until now'. Pass a period/month/from/to to limit to a span, or a date for one day. Never ask the parent for a date first; summarise whatever range they asked about.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Optional single day YYYY-MM-DD.",
            },
            ...rangeProps,
          },
          required: [],
        },
      },
      {
        name: "getPickups",
        description:
          "Get the child's pick-up time notices (who collects the child and when). With no arguments returns the full history; pass a period/month/from/to for a span, or a date for one day.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Optional single day YYYY-MM-DD.",
            },
            ...rangeProps,
          },
          required: [],
        },
      },
      {
        name: "getDocuments",
        description:
          "List the child's document requests/submissions the center has sent to this parent (forms, consents, files to fill in) and their status (draft, submitted, etc.).",
        parameters: { type: "object", properties: {}, required: [] },
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

      case "getAttendance": {
        const range = hasRangeArgs(args) ? resolveRange(args) : null;
        const attendance = await this.attendanceService.listForParent(userId, {
          childId,
          from: range?.from,
          to: range?.to,
        });
        return range ? { range, attendance } : attendance;
      }

      case "listNotices": {
        const notices = await this.noticesService.listForParent(
          userId,
          childId,
        );
        return notices;
      }

      case "getCalendarEvents": {
        if (hasRangeArgs(args)) {
          const range = resolveRange(args);
          return {
            range,
            events: await this.calendarService.listForParent(userId, {
              childId,
              from: range.from,
              to: range.to,
            }),
          };
        }
        const withinDays =
          typeof args.withinDays === "number" ? args.withinDays : 14;
        return this.calendarService.listForParent(userId, {
          childId,
          from: todayIso(),
          to: daysFromTodayIso(withinDays),
        });
      }

      case "getMeals": {
        if (hasRangeArgs(args)) {
          const range = resolveRange(args);
          const all = await this.mealsService.listForParent(userId, childId);
          const inRange = filterByDate(all, "mealDate", range);
          return {
            range,
            count: inRange.length,
            meals: inRange.slice(0, 150),
            note: "These are the meals served in the range. Count/aggregate by mealType or dish to answer 'which meal was served most'.",
          };
        }
        return this.mealsService.listForParent(
          userId,
          childId,
          typeof args.date === "string" ? args.date : todayIso(),
        );
      }

      case "getMedications": {
        if (typeof args.date === "string") {
          return this.medicationsService.listForParent(userId, {
            childId,
            date: args.date,
          });
        }
        const all = await this.medicationsService.listForParent(userId, {
          childId,
        });
        if (!hasRangeArgs(args)) return all;
        const range = resolveRange(args);
        return {
          range,
          medications: filterByDate(all, "requestedForDate", range),
        };
      }

      case "getPickups": {
        if (typeof args.date === "string") {
          return this.pickupsService.listForParent(userId, {
            childId,
            date: args.date,
          });
        }
        const all = await this.pickupsService.listForParent(userId, {
          childId,
        });
        if (!hasRangeArgs(args)) return all;
        const range = resolveRange(args);
        return { range, pickups: filterByDate(all, "pickupDate", range) };
      }

      case "getDocuments":
        return this.studentDocumentsService.parentRequests(userId, { childId });

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
