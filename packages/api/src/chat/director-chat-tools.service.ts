import { Injectable } from "@nestjs/common";
import { AlbumsService } from "../albums/albums.service";
import { AttendanceService } from "../attendance/attendance.service";
import { CalendarService } from "../calendar/calendar.service";
import { ClassService } from "../director/class.service";
import { DirectorService } from "../director/director.service";
import { PrismaService } from "../database/prisma.service";
import { MealsService } from "../meals/meals.service";
import { MedicationsService } from "../medications/medications.service";
import { NoticesService } from "../notices/notices.service";
import { PickupsService } from "../pickups/pickups.service";
import { ReportsService } from "../reports/reports.service";
import { StudentDocumentsService } from "../student-documents/student-documents.service";
import type { ToolDeclaration } from "./chat-tools.service";
import {
  ageFromDob,
  daysFromTodayIso,
  hasRangeArgs,
  resolveRange,
  todayIso,
} from "./chat-range.util";

/** Roles that own a center for chat scoping. */
const DIRECTOR_ROLE_NAMES = ["director", "organization_owner"];

/** Payment/invoice statuses that count as money received (mirrors DirectorService). */
const SUCCESSFUL_PAYMENT_STATUSES = new Set(["paid", "success", "completed"]);

/**
 * Per-request scope for a director chat turn: the center they run. Every tool
 * is hard-limited to this center — another center or organization is never
 * reachable. The whole toolset is READ-ONLY: it lists and reads, never mutates.
 */
export type DirectorChatScope = {
  userId: string;
  centerId: string;
  centerName: string | null;
  organizationId: string | null;
  centers: Array<{ id: string; name: string }>;
};

@Injectable()
export class DirectorChatToolsService {
  constructor(
    private readonly directorService: DirectorService,
    private readonly classService: ClassService,
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

  /** Resolve the director's center(s) and the active one for this turn. */
  async buildScope(
    userId: string,
    requestedCenterId?: string,
  ): Promise<DirectorChatScope | null> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId, role: { name: { in: DIRECTOR_ROLE_NAMES } } },
      include: {
        center: { select: { id: true, name: true } },
      },
    });

    const centerMap = new Map<string, { id: string; name: string }>();
    for (const role of roles) {
      if (role.center) centerMap.set(role.center.id, role.center);
    }
    // Organization owners with a center-less role see every center in the org.
    const orgIds = roles
      .filter((r) => !r.centerId && r.organizationId)
      .map((r) => r.organizationId as string);
    if (orgIds.length) {
      const orgCenters = await this.prisma.center.findMany({
        where: { organizationId: { in: orgIds } },
        select: { id: true, name: true },
      });
      for (const c of orgCenters) centerMap.set(c.id, c);
    }

    const centers = [...centerMap.values()];
    if (!centers.length) return null;

    const active =
      (requestedCenterId
        ? centers.find((c) => c.id === requestedCenterId)
        : undefined) ?? centers[0];

    const org = roles.find((r) => r.organizationId)?.organizationId ?? null;

    return {
      userId,
      centerId: active.id,
      centerName: active.name,
      organizationId: org,
      centers,
    };
  }

  getToolDeclarations(): ToolDeclaration[] {
    const periodProp = {
      type: "string",
      enum: ["day", "week", "month", "year", "all"],
      description:
        "Named time range: 'day' (today), 'week' (last 7 days), 'month' (this calendar month), 'year' (this calendar year), or 'all'. Use for 'this month/year/so far'. Defaults to month.",
    };
    const rangeProps = {
      period: periodProp,
      month: { type: "string", description: "A specific month as YYYY-MM." },
      from: { type: "string", description: "Explicit start day YYYY-MM-DD." },
      to: { type: "string", description: "Explicit end day YYYY-MM-DD." },
    };
    const classIdProp = {
      classId: {
        type: "string",
        description: "Optional class id (from findClass) to narrow. Omit for the whole center.",
      },
    };
    const childIdProp = {
      childId: {
        type: "string",
        description: "Optional child id (from findChild) to narrow to one child.",
      },
    };
    return [
      {
        name: "getCenterOverview",
        description:
          "The center's live snapshot: total children/classes/teachers, per-class occupancy and capacity, pending join requests, unaccepted documents, and THIS MONTH's tuition (expected, paid, unpaid, paid/unpaid children) center-wide and per class. Use for 'how are we doing', 'today's snapshot', occupancy and tuition-collection questions.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "getCenterInfo",
        description:
          "General center info: name, phone, address, region/district.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "listClasses",
        description:
          "Every class in the center: name, age group, headcount, capacity, empty seats, occupancy, and assigned teacher(s).",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "getClassDetail",
        description: "One class: full roster, assigned teachers, occupancy. Pass a classId.",
        parameters: {
          type: "object",
          properties: { classId: { type: "string", description: "Class id from findClass." } },
          required: ["classId"],
        },
      },
      {
        name: "findChild",
        description:
          "Resolve a child by name to their id BEFORE asking about one child. Matches any child in the center; returns matches (id, class, age) to disambiguate.",
        parameters: {
          type: "object",
          properties: { name: { type: "string", description: "The child's name or part of it." } },
          required: ["name"],
        },
      },
      {
        name: "findClass",
        description: "Resolve a class by name to its id. Matches any class in the center.",
        parameters: {
          type: "object",
          properties: { name: { type: "string", description: "The class name or part of it." } },
          required: ["name"],
        },
      },
      {
        name: "findStaff",
        description: "Resolve a teacher/staff member by name to their id. Matches teachers in the center.",
        parameters: {
          type: "object",
          properties: { name: { type: "string", description: "The staff name or part of it." } },
          required: ["name"],
        },
      },
      {
        name: "getChildProfile",
        description: "One child's profile (any child in the center): name, birthday, age, class, guardians. Pass a childId.",
        parameters: {
          type: "object",
          properties: { childId: { type: "string", description: "Child id from findChild." } },
          required: ["childId"],
        },
      },
      {
        name: "listStaff",
        description: "All teachers in the center: name, assigned classes, contact.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "getStaffDetail",
        description: "One teacher: profile and assigned classes. Pass a teacherUserId from findStaff.",
        parameters: {
          type: "object",
          properties: { teacherUserId: { type: "string", description: "Teacher user id from findStaff." } },
          required: ["teacherUserId"],
        },
      },
      {
        name: "getAttendance",
        description:
          "Attendance across the center. Returns a PER-CHILD tally (present/absent/late counts) plus, for a single day, each child's status and class. Use directly for 'how many absent today', 'which child has the most absences', 'who is out in which class'. Narrow with classId or childId; choose a window with period/month/from/to.",
        parameters: {
          type: "object",
          properties: { ...classIdProp, ...childIdProp, ...rangeProps },
          required: [],
        },
      },
      {
        name: "getReports",
        description:
          "Daily reports center-wide. With no classId/childId and a date it returns a per-class board of who has / has not a report that day — use for 'which classes have unwritten reports'. With a classId it returns that class's board; with a childId, that child's recent reports.",
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
          "One child's aggregated development signals (strengths, needs-practice, participation, mood). Pass a childId; default period 'all'.",
        parameters: {
          type: "object",
          properties: { ...childIdProp, period: periodProp },
          required: [],
        },
      },
      {
        name: "getTuition",
        description:
          "Tuition / finance. No args = center collection this month (expected, paid, unpaid, and unpaid amounts + unpaid-child counts per class) — use for 'collection rate' and 'which classes have the most unpaid tuition'. With a childId, that child's/family's invoices and paid status. Amounts are in UZS (so'm).",
        parameters: {
          type: "object",
          properties: { ...childIdProp, ...classIdProp, month: { type: "string", description: "A specific month YYYY-MM. Defaults to the current month." } },
          required: [],
        },
      },
      {
        name: "getMedications",
        description: "Medication requests/records across the center (or narrowed by classId/childId).",
        parameters: {
          type: "object",
          properties: {
            ...classIdProp,
            ...childIdProp,
            date: { type: "string", description: "Single day YYYY-MM-DD." },
            ...rangeProps,
          },
          required: [],
        },
      },
      {
        name: "getPickups",
        description: "Pick-up time notices across the center (or narrowed by classId/childId).",
        parameters: {
          type: "object",
          properties: {
            ...classIdProp,
            ...childIdProp,
            date: { type: "string", description: "Single day YYYY-MM-DD." },
            ...rangeProps,
          },
          required: [],
        },
      },
      {
        name: "listNotices",
        description: "Notices sent for the center (titles, bodies, status).",
        parameters: { type: "object", properties: { ...rangeProps }, required: [] },
      },
      {
        name: "getCalendarEvents",
        description: "Center calendar events/holidays. Upcoming by default; pass a period/month/from/to or withinDays.",
        parameters: {
          type: "object",
          properties: {
            ...rangeProps,
            withinDays: { type: "number", description: "Look-ahead in days when no window given. Defaults to 14." },
          },
          required: [],
        },
      },
      {
        name: "getMeals",
        description: "Center meal menu. No args = today; pass a date or a period/month/from/to for a span.",
        parameters: {
          type: "object",
          properties: { date: { type: "string", description: "Single day YYYY-MM-DD." }, ...rangeProps },
          required: [],
        },
      },
      {
        name: "getDocuments",
        description: "Student-document requests across the center and their status (pending, submitted, accepted).",
        parameters: { type: "object", properties: { ...classIdProp }, required: [] },
      },
      {
        name: "listAlbums",
        description: "Photo albums across the center (titles, counts, dates — not raw images).",
        parameters: { type: "object", properties: { ...rangeProps }, required: [] },
      },
      {
        name: "listJoinRequests",
        description: "Pending join / enrollment requests for the center (child name, requested class, parent, when). Read-only.",
        parameters: { type: "object", properties: {}, required: [] },
      },
      {
        name: "listInvitations",
        description: "Staff/parent invitations for the center and their status (pending, accepted, revoked). Read-only.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    ];
  }

  /**
   * Execute a tool by name under the director's center scope. All tools are
   * read-only; class/child/staff ids are validated by the underlying
   * center-scoped services (they reject ids outside this center).
   */
  async execute(
    scope: DirectorChatScope,
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const { userId, centerId } = scope;
    const classId = typeof args.classId === "string" ? args.classId : undefined;
    const childId = typeof args.childId === "string" ? args.childId : undefined;

    switch (name) {
      case "getCenterOverview":
        return this.directorService.getHomeSummary(centerId);

      case "getCenterInfo":
        return this.getCenterInfo(scope);

      case "listClasses":
        return this.classService.listClasses(centerId);

      case "getClassDetail": {
        if (!classId) return { error: "Provide a classId from findClass first." };
        return this.classService.getClass(centerId, classId);
      }

      case "findChild":
        return this.findChild(scope, args.name);

      case "findClass":
        return this.findClass(scope, args.name);

      case "findStaff":
        return this.findStaff(scope, args.name);

      case "getChildProfile": {
        if (!childId) return { error: "Provide a childId from findChild first." };
        return this.classService.getChild(centerId, childId);
      }

      case "listStaff":
        return this.classService.listTeachers(centerId);

      case "getStaffDetail": {
        const teacherUserId =
          typeof args.teacherUserId === "string" ? args.teacherUserId : undefined;
        if (!teacherUserId) return { error: "Provide a teacherUserId from findStaff first." };
        return this.classService.getTeacher(centerId, teacherUserId);
      }

      case "getAttendance":
        return this.getAttendance(scope, classId, childId, args);

      case "getReports":
        return this.getReports(scope, classId, childId, args);

      case "getDevelopmentSummary": {
        if (!childId) return { error: "Provide a childId from findChild first." };
        const reports = await this.reportsService.listTeacherReports(userId);
        return {
          reports: forChild(reports, childId).slice(0, 60),
          note: "Synthesize strengths, needs-practice, participation and mood trends from these reports.",
        };
      }

      case "getTuition":
        return this.getTuition(scope, classId, childId, args);

      case "getMedications": {
        const filters = this.dateFilters(args);
        const list = await this.medicationsService.listForStaff(userId, centerId, filters);
        return narrowByIds(list, classId, childId);
      }

      case "getPickups": {
        const filters = this.dateFilters(args);
        if (classId) (filters as { classId?: string }).classId = classId;
        const list = await this.pickupsService.listForStaff(userId, centerId, filters);
        return narrowByIds(list, undefined, childId);
      }

      case "listNotices":
        return this.noticesService.listForAuthor(userId, centerId);

      case "getCalendarEvents": {
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

      case "getMeals":
        return this.mealsService.listForStaff(userId, centerId, {
          date: typeof args.date === "string" ? args.date : todayIso(),
        });

      case "getDocuments":
        return this.studentDocumentsService.staffRequests(userId, { centerId });

      case "listAlbums":
        return this.albumsService.listForStaff(userId, centerId);

      case "listJoinRequests":
        return this.directorService.listJoinRequests(
          centerId,
          { status: "pending" },
          { userId, directorView: true },
        );

      case "listInvitations":
        return this.directorService.listInvitations(centerId);

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  // --- tool implementations ---

  private async getCenterInfo(scope: DirectorChatScope): Promise<unknown> {
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

  private async findChild(
    scope: DirectorChatScope,
    rawName: unknown,
  ): Promise<unknown> {
    const query = typeof rawName === "string" ? rawName.trim() : "";
    if (!query) return { matches: [], note: "Provide a name to search for." };
    const enrollments = await this.prisma.childEnrollment.findMany({
      where: {
        centerId: scope.centerId,
        enrollmentStatus: "active",
        child: {
          status: "active",
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      select: {
        child: { select: { id: true, firstName: true, lastName: true, dob: true } },
        class: { select: { name: true } },
      },
      take: 25,
    });
    return {
      matches: enrollments.map((e) => ({
        childId: e.child.id,
        name: [e.child.firstName, e.child.lastName].filter(Boolean).join(" "),
        className: e.class?.name ?? null,
        age: ageFromDob(e.child.dob.toISOString().slice(0, 10)),
      })),
    };
  }

  private async findClass(
    scope: DirectorChatScope,
    rawName: unknown,
  ): Promise<unknown> {
    const query = typeof rawName === "string" ? rawName.trim().toLowerCase() : "";
    if (!query) return { matches: [], note: "Provide a name to search for." };
    const classes = (await this.classService.listClasses(scope.centerId)) as Array<{
      id: string;
      name: string;
    }>;
    return {
      matches: classes
        .filter((c) => c.name.toLowerCase().includes(query))
        .map((c) => ({ classId: c.id, name: c.name })),
    };
  }

  private async findStaff(
    scope: DirectorChatScope,
    rawName: unknown,
  ): Promise<unknown> {
    const query = typeof rawName === "string" ? rawName.trim().toLowerCase() : "";
    if (!query) return { matches: [], note: "Provide a name to search for." };
    const teachers = (await this.classService.listTeachers(scope.centerId)) as Array<{
      userId?: string;
      teacherUserId?: string;
      id?: string;
      fullName?: string;
      name?: string;
    }>;
    return {
      matches: teachers
        .map((t) => ({
          teacherUserId: t.teacherUserId ?? t.userId ?? t.id ?? null,
          name: t.fullName ?? t.name ?? null,
        }))
        .filter((t) => t.name && t.name.toLowerCase().includes(query)),
    };
  }

  private async getAttendance(
    scope: DirectorChatScope,
    classId: string | undefined,
    childId: string | undefined,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const range = hasRangeArgs(args)
      ? resolveRange(args)
      : resolveRange({ period: "month" });
    const rows = await this.prisma.attendanceRecord.findMany({
      where: {
        centerId: scope.centerId,
        ...(classId ? { classId } : {}),
        ...(childId ? { childId } : {}),
        attendanceDate: {
          gte: new Date(`${range.from}T00:00:00.000Z`),
          lte: new Date(`${range.to}T23:59:59.999Z`),
        },
      },
      select: {
        childId: true,
        attendanceDate: true,
        status: true,
        child: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } },
      },
    });

    type Bucket = {
      child: string;
      className: string | null;
      present: number;
      absent: number;
      late: number;
      excused: number;
    };
    const tally = new Map<string, Bucket>();
    const today = todayIso();
    const todayStatuses: Array<{ child: string; className: string | null; status: string }> = [];
    for (const row of rows) {
      const name = [row.child.firstName, row.child.lastName].filter(Boolean).join(" ");
      const bucket =
        tally.get(row.childId) ??
        { child: name, className: row.class?.name ?? null, present: 0, absent: 0, late: 0, excused: 0 };
      if (row.status === "absent") bucket.absent += 1;
      else if (row.status === "late") bucket.late += 1;
      else if (row.status === "excused") bucket.excused += 1;
      else bucket.present += 1;
      tally.set(row.childId, bucket);
      if (row.attendanceDate.toISOString().slice(0, 10) === today) {
        todayStatuses.push({ child: name, className: row.class?.name ?? null, status: row.status });
      }
    }

    const perChild = [...tally.values()].sort((a, b) => b.absent - a.absent);
    return {
      range,
      perChild: perChild.slice(0, 200),
      today: range.from <= today && today <= range.to ? todayStatuses : undefined,
      note: "perChild is sorted by most absences first. Aggregate/rank as needed; counts are center-wide unless narrowed.",
    };
  }

  private async getReports(
    scope: DirectorChatScope,
    classId: string | undefined,
    childId: string | undefined,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const { userId } = scope;

    if (childId) {
      const reports = await this.reportsService.listTeacherReports(userId);
      return { childId, reports: forChild(reports, childId).slice(0, 40) };
    }

    const date = typeof args.date === "string" ? args.date : todayIso();
    const wantsBoard = !hasRangeArgs(args) || typeof args.date === "string";
    if (wantsBoard) {
      const classes = (
        (await this.classService.listClasses(scope.centerId)) as Array<{ id: string; name: string }>
      ).filter((c) => (classId ? c.id === classId : true));
      const boards = await Promise.all(
        classes.slice(0, 40).map(async (c) => ({
          classId: c.id,
          className: c.name,
          date,
          statuses: await this.reportsService
            .listClassReportStatuses(userId, c.id, date)
            .catch(() => null),
        })),
      );
      return {
        date,
        note: "Each class lists every child with their report (or null = not written yet).",
        classes: boards,
      };
    }

    const reports = await this.reportsService.listTeacherReports(userId);
    return { reports: (reports as unknown[]).slice(0, 40) };
  }

  private async getTuition(
    scope: DirectorChatScope,
    classId: string | undefined,
    childId: string | undefined,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    // One child's / family's invoices.
    if (childId) {
      const invoices = await this.prisma.invoice.findMany({
        where: { centerId: scope.centerId, childId },
        include: { payments: true },
        orderBy: { periodStart: "desc" },
        take: 24,
      });
      return {
        currency: "UZS",
        invoices: invoices.map((inv) => {
          const paid = inv.payments
            .filter((p) => SUCCESSFUL_PAYMENT_STATUSES.has(p.status.toLowerCase()))
            .reduce((sum, p) => sum + Number(p.amount), 0);
          const amount = Number(inv.amount);
          return {
            amount,
            paid,
            unpaid: Math.max(0, amount - paid),
            status: inv.status,
            periodStart: inv.periodStart?.toISOString().slice(0, 10) ?? null,
            periodEnd: inv.periodEnd?.toISOString().slice(0, 10) ?? null,
            dueDate: inv.dueDate?.toISOString().slice(0, 10) ?? null,
          };
        }),
      };
    }

    // Center-wide (and per-class) collection for the month, from the home summary.
    const summary = (await this.directorService.getHomeSummary(scope.centerId)) as {
      currency: string;
      month: { label: string };
      money: unknown;
      classes: Array<{ id: string; name: string }>;
    };
    if (classId) {
      const klass = summary.classes.find((c) => c.id === classId);
      return { currency: summary.currency, month: summary.month, class: klass ?? { note: "Class not found." } };
    }
    return {
      currency: summary.currency,
      month: summary.month,
      money: summary.money,
      classes: summary.classes,
      note: "money is the center total this month. classes carries per-class expected/paid/unpaid and unpaid-child counts.",
    };
  }

  private dateFilters(args: Record<string, unknown>): {
    date?: string;
    from?: string;
    to?: string;
  } {
    if (typeof args.date === "string") return { date: args.date };
    if (hasRangeArgs(args)) {
      const range = resolveRange(args);
      return { from: range.from, to: range.to };
    }
    return {};
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

/** Filter a staff list response by class and/or child where the shape allows. */
function narrowByIds(
  list: unknown,
  classId: string | undefined,
  childId: string | undefined,
): unknown {
  if (!Array.isArray(list) || (!classId && !childId)) return list;
  return list.filter((item) => {
    const rec = item as { child?: { id?: string }; childId?: string; classId?: string };
    const cId = rec.child?.id ?? rec.childId;
    if (childId && cId !== childId) return false;
    if (classId && rec.classId && rec.classId !== classId) return false;
    return true;
  });
}
