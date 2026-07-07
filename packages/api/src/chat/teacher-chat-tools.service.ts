import { Injectable } from "@nestjs/common";
import { AlbumsService } from "../albums/albums.service";
import { AttendanceService } from "../attendance/attendance.service";
import { CalendarService } from "../calendar/calendar.service";
import { PrismaService } from "../database/prisma.service";
import { MealsService } from "../meals/meals.service";
import { MedicationsService } from "../medications/medications.service";
import { NoticesService } from "../notices/notices.service";
import { PickupsService } from "../pickups/pickups.service";
import { ReportsService } from "../reports/reports.service";
import { StudentDocumentsService } from "../student-documents/student-documents.service";
import { TeacherService } from "../teacher/teacher.service";
import type { ToolDeclaration } from "./chat-tools.service";
import {
  ageFromDob,
  daysFromTodayIso,
  filterByDate,
  hasRangeArgs,
  resolveRange,
  todayIso,
} from "./chat-range.util";

/** Roles that count as the center's director for "who is the director" info. */
const DIRECTOR_ROLE_NAMES = ["director", "organization_owner"];

type TeacherClass = {
  id: string;
  name: string;
  ageGroup: string | null;
  childCount: number;
};

type TeacherChild = {
  id: string;
  name: string;
  classId: string;
  className: string;
  dateOfBirth: string | null;
  gender: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianRelation: string | null;
};

/**
 * Per-request scope for a teacher chat turn: the classes she is actively
 * assigned to and every child actively enrolled in them. Every tool is hard
 * limited to this scope — a class or child outside it is never reachable.
 */
export type TeacherChatScope = {
  userId: string;
  centerId: string | null;
  classes: TeacherClass[];
  children: TeacherChild[];
};

/**
 * The tools the teacher chatroom AI may call. Every tool is scoped to the
 * teacher's own classes (built once in `buildScope`); any class/child id the
 * model supplies is validated against that scope before a query runs. Data for
 * a child outside her classes is not reachable through any tool.
 */
@Injectable()
export class TeacherChatToolsService {
  constructor(
    private readonly teacherService: TeacherService,
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

  /** Resolve the teacher's classes + full roster for this turn. */
  async buildScope(userId: string): Promise<TeacherChatScope> {
    const classes = await this.teacherService.listClasses(userId);
    const rosters = await Promise.all(
      classes.map((klass) =>
        this.teacherService
          .listClassChildren(userId, klass.id)
          .then((children) =>
            children.map((c) => ({
              id: c.childId,
              name: c.name,
              classId: klass.id,
              className: klass.name,
              dateOfBirth: c.dateOfBirth,
              gender: c.gender,
              guardianName: c.guardianName,
              guardianPhone: c.guardianPhone,
              guardianRelation: c.guardianRelation,
            })),
          )
          .catch(() => []),
      ),
    );

    const centerId = classes.length
      ? (
          await this.prisma.class.findUnique({
            where: { id: classes[0].id },
            select: { centerId: true },
          })
        )?.centerId ?? null
      : null;

    return {
      userId,
      centerId,
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        ageGroup: c.ageGroup,
        childCount: c.childCount,
      })),
      children: rosters.flat(),
    };
  }

  getToolDeclarations(): ToolDeclaration[] {
    const periodProp = {
      type: "string",
      enum: ["day", "week", "month", "year", "all"],
      description:
        "Named time range: 'day' (today), 'week' (last 7 days), 'month' (this calendar month), 'year' (this calendar year), or 'all' (everything to date). Use for 'this month', 'this year', 'so far'. Defaults to month.",
    };
    const rangeProps = {
      period: periodProp,
      month: {
        type: "string",
        description: "A specific calendar month as YYYY-MM (e.g. 2026-06).",
      },
      from: { type: "string", description: "Explicit start day YYYY-MM-DD." },
      to: { type: "string", description: "Explicit end day YYYY-MM-DD." },
    };
    const classIdProp = {
      classId: {
        type: "string",
        description:
          "Optional class id to narrow to one of the teacher's classes. Omit to cover ALL her classes.",
      },
    };
    const childIdProp = {
      childId: {
        type: "string",
        description:
          "Optional child id (from findChild) to narrow to one child. Omit for the whole class.",
      },
    };
    return [
      {
        name: "listMyClasses",
        description:
          "List the teacher's own classes: name, age group, how many children, and the co-teacher(s) assigned. Use for 'how many classes do I have' and class overviews.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "getCenterInfo",
        description:
          "General center info a staff member should know: center name, phone, address, region/district, the director's name, and the total number of classes and children in the center. Never returns other classes' rosters or any finances.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "findChild",
        description:
          "Resolve a child by name to their id BEFORE asking anything about one specific child. Matches only children in the teacher's classes; returns the matches (id, class, age) so you can disambiguate if several share a name.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "The child's name or part of it." },
          },
          required: ["name"],
        },
      },
      {
        name: "getClassRoster",
        description:
          "Full roster for a class (or all the teacher's classes if no classId): each child's name, age, gender, and guardian name + phone.",
        parameters: {
          type: "object",
          properties: { ...classIdProp },
          required: [],
        },
      },
      {
        name: "getChildProfile",
        description:
          "One child's profile: name, birthday, age, class, and guardian contact. Pass a childId from findChild.",
        parameters: {
          type: "object",
          properties: {
            childId: { type: "string", description: "Child id from findChild." },
          },
          required: ["childId"],
        },
      },
      {
        name: "getDailyReports",
        description:
          "Daily reports for the class or a child. With a classId (and optional date, default today) it returns a per-child board showing WHO HAS and WHO HAS NOT a report that day — use this for 'which reports are still unwritten' / 'who has no report today'. With a childId it returns that child's recent reports for the period.",
        parameters: {
          type: "object",
          properties: {
            ...classIdProp,
            ...childIdProp,
            date: { type: "string", description: "Day YYYY-MM-DD. Defaults to today." },
            period: periodProp,
          },
          required: [],
        },
      },
      {
        name: "getDevelopmentSummary",
        description:
          "One child's aggregated development signals (strengths, needs-practice, participation, mood) across a period. Use for 'how is X developing / what is X good at'. Pass a childId; default period 'all'.",
        parameters: {
          type: "object",
          properties: { ...childIdProp, period: periodProp },
          required: [],
        },
      },
      {
        name: "getAttendance",
        description:
          "Attendance across the teacher's classes. Returns a PER-CHILD tally (present/absent/late counts) plus, for a single day, each child's status. Use this directly for 'who is absent today', 'who has the most absences', 'who has perfect attendance' — rank/aggregate the returned tally yourself. Narrow with classId or childId; choose a window with period/month/from/to. Never ask the teacher to pick a date.",
        parameters: {
          type: "object",
          properties: { ...classIdProp, ...childIdProp, ...rangeProps },
          required: [],
        },
      },
      {
        name: "getMedications",
        description:
          "Medication requests/records in the teacher's classes (child, medicine, dose, schedule, status). Use for 'whose medication is due today' and 'any requests I haven't handled'. Narrow with a date, a period/month/from/to, or a childId.",
        parameters: {
          type: "object",
          properties: {
            ...childIdProp,
            date: { type: "string", description: "Single day YYYY-MM-DD." },
            ...rangeProps,
          },
          required: [],
        },
      },
      {
        name: "getPickups",
        description:
          "Pick-up time notices in the teacher's classes (who collects a child and when). Use for 'who is picked up early today' and pick-up changes. Narrow with a date, a period/month/from/to, or a childId.",
        parameters: {
          type: "object",
          properties: {
            ...childIdProp,
            date: { type: "string", description: "Single day YYYY-MM-DD." },
            ...rangeProps,
          },
          required: [],
        },
      },
      {
        name: "listNotices",
        description:
          "Notices the teacher has sent to her classes (titles + bodies + status). Use for 'what notices went out this week' and 'which are unconfirmed'.",
        parameters: {
          type: "object",
          properties: { ...rangeProps },
          required: [],
        },
      },
      {
        name: "getCalendarEvents",
        description:
          "Calendar events/holidays for the teacher's classes/center. Upcoming by default; pass a period/month/from/to for a span, or withinDays for a look-ahead. Use for 'any events this week' and 'is there school tomorrow'.",
        parameters: {
          type: "object",
          properties: {
            ...rangeProps,
            withinDays: {
              type: "number",
              description:
                "Upcoming look-ahead in days when no period/from/to given. Defaults to 14.",
            },
          },
          required: [],
        },
      },
      {
        name: "getMeals",
        description:
          "Meal menu for the center. No args = today's menu; pass a date for one day, or a period/month/from/to for a span (e.g. this week's menu).",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Single day YYYY-MM-DD. Defaults to today." },
            ...rangeProps,
          },
          required: [],
        },
      },
      {
        name: "getDocuments",
        description:
          "Student-document requests in the teacher's classes and their status (pending, submitted, reviewed). Use for 'which document requests are still pending'.",
        parameters: {
          type: "object",
          properties: { ...classIdProp },
          required: [],
        },
      },
      {
        name: "listAlbums",
        description:
          "Photo albums for the teacher's classes (titles, counts, dates — not raw images). Use for 'what albums did I post this month'.",
        parameters: {
          type: "object",
          properties: { ...rangeProps },
          required: [],
        },
      },
      {
        name: "listJoinRequests",
        description:
          "Pending join / enrollment requests awaiting action for the teacher's classes (child name, requested class, when). Use for 'any pending join requests'.",
        parameters: {
          type: "object",
          properties: { ...classIdProp },
          required: [],
        },
      },
    ];
  }

  /**
   * Execute a tool by name with model-supplied args, always under the given
   * scope. Out-of-scope classes/children and unknown tools are rejected with a
   * plain error object (never throw arbitrary data back to the model).
   */
  async execute(
    scope: TeacherChatScope,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const { userId, centerId } = scope;
    const classId = this.resolveClassId(scope, args);
    if (classId instanceof Error) return { error: classId.message };
    const childId = this.resolveChildId(scope, args);
    if (childId instanceof Error) return { error: childId.message };

    switch (name) {
      case "listMyClasses":
        return this.listMyClasses(scope);

      case "getCenterInfo":
        return this.getCenterInfo(scope);

      case "findChild":
        return this.findChild(scope, args.name);

      case "getClassRoster": {
        const children = classId
          ? scope.children.filter((c) => c.classId === classId)
          : scope.children;
        return {
          count: children.length,
          children: children.map((c) => ({
            childId: c.id,
            name: c.name,
            className: c.className,
            age: ageFromDob(c.dateOfBirth),
            gender: c.gender,
            guardianName: c.guardianName,
            guardianPhone: c.guardianPhone,
          })),
        };
      }

      case "getChildProfile": {
        const child = scope.children.find((c) => c.id === childId);
        if (!child) return { error: "Provide a childId from findChild first." };
        return {
          childId: child.id,
          name: child.name,
          birthday: child.dateOfBirth,
          age: ageFromDob(child.dateOfBirth),
          className: child.className,
          gender: child.gender,
          guardianName: child.guardianName,
          guardianPhone: child.guardianPhone,
          guardianRelation: child.guardianRelation,
        };
      }

      case "getDailyReports":
        return this.getDailyReports(scope, classId, childId, args);

      case "getDevelopmentSummary": {
        if (!childId) return { error: "Provide a childId from findChild first." };
        const reports = await this.reportsService.listTeacherReports(userId);
        const child = scope.children.find((c) => c.id === childId);
        return {
          child: child?.name ?? null,
          reports: forChild(reports, childId).slice(0, 60),
          note: "Synthesize strengths, needs-practice, participation and mood trends from these reports.",
        };
      }

      case "getAttendance":
        return this.getAttendance(scope, classId, childId, args);

      case "getMedications": {
        if (!centerId) return { note: "No center on file." };
        const filters: { date?: string; from?: string; to?: string } = {};
        if (typeof args.date === "string") filters.date = args.date;
        else if (hasRangeArgs(args)) {
          const range = resolveRange(args);
          filters.from = range.from;
          filters.to = range.to;
        }
        const list = await this.medicationsService.listForStaff(
          userId,
          centerId,
          filters,
        );
        return childId ? narrowToChild(list, childId) : list;
      }

      case "getPickups": {
        if (!centerId) return { note: "No center on file." };
        const filters: {
          date?: string;
          from?: string;
          to?: string;
          classId?: string;
        } = {};
        if (classId) filters.classId = classId;
        if (typeof args.date === "string") filters.date = args.date;
        else if (hasRangeArgs(args)) {
          const range = resolveRange(args);
          filters.from = range.from;
          filters.to = range.to;
        }
        const list = await this.pickupsService.listForStaff(
          userId,
          centerId,
          filters,
        );
        return childId ? narrowToChild(list, childId) : list;
      }

      case "listNotices": {
        if (!centerId) return { note: "No center on file." };
        const notices = await this.noticesService.listForAuthor(userId, centerId);
        if (!hasRangeArgs(args)) return notices;
        const range = resolveRange(args);
        return {
          range,
          notices: filterByDate(
            notices as Array<Record<string, unknown>>,
            "createdAt",
            range,
          ),
        };
      }

      case "getCalendarEvents": {
        if (!centerId) return { note: "No center on file." };
        const range = hasRangeArgs(args)
          ? resolveRange(args)
          : {
              from: todayIso(),
              to: daysFromTodayIso(
                typeof args.withinDays === "number" ? args.withinDays : 14,
              ),
            };
        return {
          range,
          events: await this.calendarService.listForStaff(userId, {
            centerId,
            from: range.from,
            to: range.to,
          }),
        };
      }

      case "getMeals": {
        if (!centerId) return { note: "No center on file." };
        if (hasRangeArgs(args)) {
          const range = resolveRange(args);
          const all = await this.mealsService.listForStaff(userId, centerId, {});
          return {
            range,
            meals: filterByDate(
              all as Array<Record<string, unknown>>,
              "mealDate",
              range,
            ),
          };
        }
        return this.mealsService.listForStaff(userId, centerId, {
          date: typeof args.date === "string" ? args.date : todayIso(),
        });
      }

      case "getDocuments": {
        if (!centerId) return { note: "No center on file." };
        const requests = await this.studentDocumentsService.staffRequests(
          userId,
          { centerId },
        );
        return requests;
      }

      case "listAlbums": {
        if (!centerId) return { note: "No center on file." };
        const albums = await this.albumsService.listForStaff(userId, centerId);
        if (!hasRangeArgs(args)) return albums;
        const range = resolveRange(args);
        return {
          range,
          albums: filterByDate(
            albums as Array<Record<string, unknown>>,
            "publishedAt",
            range,
          ),
        };
      }

      case "listJoinRequests":
        return this.listJoinRequests(scope, classId);

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  // --- tool implementations ---

  private async listMyClasses(scope: TeacherChatScope): Promise<unknown> {
    if (!scope.classes.length) return { classes: [], note: "No classes assigned." };
    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: { classId: { in: scope.classes.map((c) => c.id) }, endedAt: null },
      include: { teacherUser: { select: { fullName: true } } },
    });
    const teachersByClass = new Map<string, string[]>();
    for (const a of assignments) {
      const list = teachersByClass.get(a.classId) ?? [];
      list.push(a.teacherUser.fullName);
      teachersByClass.set(a.classId, list);
    }
    return {
      classes: scope.classes.map((c) => ({
        classId: c.id,
        name: c.name,
        ageGroup: c.ageGroup,
        childCount: c.childCount,
        teachers: teachersByClass.get(c.id) ?? [],
      })),
    };
  }

  private async getCenterInfo(scope: TeacherChatScope): Promise<unknown> {
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
        organizationId: true,
      },
    });
    if (!center) return { note: "Center not found." };

    const director = await this.prisma.userRole.findFirst({
      where: {
        role: { name: { in: DIRECTOR_ROLE_NAMES } },
        OR: [
          { centerId: scope.centerId },
          { organizationId: center.organizationId, centerId: null },
        ],
      },
      include: { user: { select: { fullName: true } } },
    });

    const [classCount, childCount] = await Promise.all([
      this.prisma.class.count({
        where: { centerId: scope.centerId, status: "active" },
      }),
      this.prisma.childEnrollment.count({
        where: { centerId: scope.centerId, enrollmentStatus: "active" },
      }),
    ]);

    return {
      name: center.name,
      phone: center.phone,
      address: center.address,
      region: center.region,
      district: center.district,
      facilityType: center.facilityType,
      director: director?.user.fullName ?? null,
      totalClasses: classCount,
      totalChildren: childCount,
    };
  }

  private findChild(scope: TeacherChatScope, rawName: unknown): unknown {
    const query = typeof rawName === "string" ? rawName.trim().toLowerCase() : "";
    if (!query) return { matches: [], note: "Provide a name to search for." };
    const matches = scope.children.filter((c) =>
      c.name.toLowerCase().includes(query),
    );
    return {
      matches: matches.map((c) => ({
        childId: c.id,
        name: c.name,
        className: c.className,
        age: ageFromDob(c.dateOfBirth),
      })),
      note: matches.length
        ? "If more than one matches, ask the teacher which class, or answer for each."
        : "No child by that name in your classes.",
    };
  }

  private async getDailyReports(
    scope: TeacherChatScope,
    classId: string | null,
    childId: string | null,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const { userId } = scope;

    // One child's reports over a window.
    if (childId) {
      const reports = await this.reportsService.listTeacherReports(userId);
      return { childId, reports: forChild(reports, childId).slice(0, 40) };
    }

    // A per-child "who wrote / who hasn't" board for a day.
    const date = typeof args.date === "string" ? args.date : todayIso();
    if (!hasRangeArgs(args) || typeof args.date === "string") {
      const classes = classId
        ? scope.classes.filter((c) => c.id === classId)
        : scope.classes;
      const boards = await Promise.all(
        classes.map(async (c) => ({
          classId: c.id,
          className: c.name,
          date,
          statuses: await this.reportsService.listClassReportStatuses(
            userId,
            c.id,
            date,
          ),
        })),
      );
      return {
        date,
        note: "Each class lists every child with their report (or null = not written yet).",
        classes: boards,
      };
    }

    // A recent window of the teacher's class reports.
    const reports = await this.reportsService.listTeacherReports(userId);
    return { reports: (reports as unknown[]).slice(0, 40) };
  }

  private async getAttendance(
    scope: TeacherChatScope,
    classId: string | null,
    childId: string | null,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    let children = scope.children;
    if (classId) children = children.filter((c) => c.classId === classId);
    if (childId) children = children.filter((c) => c.id === childId);
    if (!children.length) return { note: "No children in scope." };

    const range = hasRangeArgs(args) ? resolveRange(args) : resolveRange({ period: "month" });
    const childIds = children.map((c) => c.id);
    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        childId: { in: childIds },
        attendanceDate: {
          gte: new Date(`${range.from}T00:00:00.000Z`),
          lte: new Date(`${range.to}T23:59:59.999Z`),
        },
      },
      select: { childId: true, attendanceDate: true, status: true },
    });

    const nameById = new Map(children.map((c) => [c.id, c.name]));
    const tally = new Map<
      string,
      { present: number; absent: number; late: number; excused: number }
    >();
    for (const id of childIds) {
      tally.set(id, { present: 0, absent: 0, late: 0, excused: 0 });
    }
    const todayStatuses: Array<{ child: string; status: string }> = [];
    const today = todayIso();
    for (const row of rows) {
      const bucket = tally.get(row.childId);
      if (!bucket) continue;
      if (row.status === "absent") bucket.absent += 1;
      else if (row.status === "late") bucket.late += 1;
      else if (row.status === "excused") bucket.excused += 1;
      else bucket.present += 1; // present / checked_in / checked_out
      if (row.attendanceDate.toISOString().slice(0, 10) === today) {
        todayStatuses.push({
          child: nameById.get(row.childId) ?? row.childId,
          status: row.status,
        });
      }
    }

    const perChild = childIds
      .map((id) => ({ child: nameById.get(id) ?? id, ...tally.get(id)! }))
      .sort((a, b) => b.absent - a.absent);

    return {
      range,
      perChild,
      today: range.from <= today && today <= range.to ? todayStatuses : undefined,
      note: "perChild is sorted by most absences first. Rank/aggregate as needed.",
    };
  }

  private async listJoinRequests(
    scope: TeacherChatScope,
    classId: string | null,
  ): Promise<unknown> {
    const classIds = classId
      ? [classId]
      : scope.classes.map((c) => c.id);
    if (!classIds.length) return { requests: [], note: "No classes assigned." };
    const requests = await this.prisma.centerJoinRequest.findMany({
      where: {
        status: "pending",
        requestedClassId: { in: classIds },
      },
      include: {
        requestedClass: { select: { name: true } },
        parentUser: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      count: requests.length,
      requests: requests.map((r) => ({
        childName: r.childName,
        requestedClass: r.requestedClass?.name ?? null,
        parent: r.parentUser.fullName,
        relationship: r.parentRelationship,
        requestedAt: r.createdAt.toISOString().slice(0, 10),
      })),
    };
  }

  // --- scope validation ---

  /** Validate a model-supplied classId is one of the teacher's; null if none. */
  private resolveClassId(
    scope: TeacherChatScope,
    args: Record<string, unknown>,
  ): string | null | Error {
    const raw = typeof args.classId === "string" ? args.classId : null;
    if (!raw) return null;
    return scope.classes.some((c) => c.id === raw)
      ? raw
      : new Error("That class is not one of yours.");
  }

  /** Validate a model-supplied childId is in the teacher's roster; null if none. */
  private resolveChildId(
    scope: TeacherChatScope,
    args: Record<string, unknown>,
  ): string | null | Error {
    const raw = typeof args.childId === "string" ? args.childId : null;
    if (!raw) return null;
    return scope.children.some((c) => c.id === raw)
      ? raw
      : new Error("That child is not in your classes.");
  }
}

/** Keep only report summaries belonging to a given child. */
function forChild(reports: unknown, childId: string): unknown[] {
  if (!Array.isArray(reports)) return [];
  return reports.filter((r) => {
    const child = (r as { child?: { id?: string }; childId?: string }).child;
    const id = child?.id ?? (r as { childId?: string }).childId;
    return id === childId;
  });
}

/** Filter a staff list response down to one child where the shape allows. */
function narrowToChild(list: unknown, childId: string): unknown {
  if (!Array.isArray(list)) return list;
  return list.filter((item) => {
    const child = (item as { child?: { id?: string }; childId?: string }).child;
    const id = child?.id ?? (item as { childId?: string }).childId;
    return id === childId;
  });
}
