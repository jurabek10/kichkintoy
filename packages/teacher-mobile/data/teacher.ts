/**
 * Teacher data access — the single seam between "where teacher data comes from"
 * and "how a screen renders it". Mirrors the parent app's `data/parent.ts`
 * pattern (query-shaped hooks returning `{ data, isPending }`), but reads the
 * staff-facing oRPC endpoints: the teacher's own classes and roster, plus the
 * center-scoped attendance / reports / medications / meals / albums / notices /
 * pickups lists the server already scopes to the classes she teaches.
 */
import { useQuery } from '@tanstack/react-query';

import i18n from '@/i18n';
import { ageLabel, formatLongDate, todayIsoDate } from '@/lib/date';
import { useAuth } from '@/lib/auth';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

export type Query<T> = {
  data: T;
  isPending: boolean;
};

// Derive the API shapes from the typed client so we never drift from the contract.
type ApiClass = Awaited<ReturnType<typeof orpc.teacher.classes>>[number];
type ApiRosterChild = Awaited<ReturnType<typeof orpc.teacher.classChildren>>[number];
type ApiChildDetail = Awaited<ReturnType<typeof orpc.teacher.child>>;
type ApiClassStatus = Awaited<ReturnType<typeof orpc.reports.classStatuses>>[number];

/** The center the signed-in teacher belongs to. Most staff lists need it. */
export function useCenterId(): string | null {
  const { session } = useAuth();
  return session?.membership.centerId ?? null;
}

// --- Classes & roster -----------------------------------------------------

export type TeacherClass = {
  id: string;
  name: string;
  ageGroup: string | null;
  childCount: number;
  maxChildren: number | null;
  assignmentRole: ApiClass['assignmentRole'];
};

function toClass(klass: ApiClass): TeacherClass {
  return {
    id: klass.id,
    name: klass.name,
    ageGroup: klass.ageGroup,
    childCount: klass.childCount,
    maxChildren: klass.maxChildren,
    assignmentRole: klass.assignmentRole,
  };
}

export function useTeacherClasses(): Query<TeacherClass[]> {
  const query = useQuery({
    queryKey: teacherQueryKeys.classes,
    queryFn: () => orpc.teacher.classes({}),
  });
  return { data: (query.data ?? []).map(toClass), isPending: query.isPending };
}

export type RosterChild = {
  id: string;
  name: string;
  photo: string | null;
  ageLabel: string;
  /** Raw date of birth, kept so the roster can sort by age. */
  dob: string | null;
  gender: ApiRosterChild['gender'];
};

function toRosterChild(child: ApiRosterChild): RosterChild {
  return {
    id: child.childId,
    name: child.name,
    photo: child.photoUrl,
    ageLabel: child.dateOfBirth ? ageLabel(child.dateOfBirth) : '',
    dob: child.dateOfBirth ?? null,
    gender: child.gender,
  };
}

export function useClassRoster(classId: string): Query<RosterChild[]> {
  const query = useQuery({
    queryKey: teacherQueryKeys.roster(classId),
    queryFn: () => orpc.teacher.classChildren({ classId }),
    enabled: !!classId,
  });
  return { data: (query.data ?? []).map(toRosterChild), isPending: !!classId && query.isPending };
}

export type ChildProfile = {
  id: string;
  name: string;
  firstName: string;
  lastName: string | null;
  photo: string | null;
  birthLabel: string;
  ageLabel: string;
  gender: ApiChildDetail['gender'];
  className: string | null;
  /** Whether the child is still actively enrolled (vs. removed). */
  status: string;
  /** Formatted enrollment start date, or '' when unknown. */
  joinedLabel: string;
  allergies: string | null;
  medicalNotes: string | null;
  guardians: {
    id: string;
    name: string;
    phone: string | null;
    relationship: string | null;
    isPrimary: boolean;
  }[];
};

function toChildProfile(child: ApiChildDetail): ChildProfile {
  const lang = i18n.language;
  return {
    id: child.id,
    name: child.name,
    firstName: child.firstName,
    lastName: child.lastName,
    photo: child.photoUrl,
    birthLabel: child.dateOfBirth ? formatLongDate(child.dateOfBirth, lang) : '',
    ageLabel: child.dateOfBirth ? ageLabel(child.dateOfBirth) : '',
    gender: child.gender,
    className: child.enrollment?.className ?? null,
    status: child.status,
    joinedLabel: child.enrollment?.startedAt ? formatLongDate(child.enrollment.startedAt, lang) : '',
    allergies: child.allergies,
    medicalNotes: child.medicalNotes,
    guardians: child.guardians.map((guardian) => ({
      id: guardian.userId,
      name: guardian.fullName,
      phone: guardian.phone,
      relationship: guardian.relationship,
      isPrimary: guardian.isPrimary,
    })),
  };
}

export function useChildProfile(childId: string): Query<ChildProfile | null> {
  const query = useQuery({
    queryKey: teacherQueryKeys.child(childId),
    queryFn: () => orpc.teacher.child({ childId }),
    enabled: !!childId,
  });
  return { data: query.data ? toChildProfile(query.data) : null, isPending: !!childId && query.isPending };
}

// --- Per-class report progress (today) ------------------------------------

export type ClassReportStatus = {
  childId: string;
  name: string;
  photo: string | null;
  status: 'published' | 'draft' | 'none';
  /** The report's id when one exists (draft or published), else null. */
  reportId: string | null;
};

function toReportStatus(row: ApiClassStatus): ClassReportStatus {
  const status = row.report?.status;
  return {
    childId: row.id,
    name: row.name,
    photo: row.photoUrl,
    status: status === 'published' ? 'published' : status ? 'draft' : 'none',
    reportId: row.report?.id ?? null,
  };
}

export function useClassReportStatuses(classId: string, date: string): Query<ClassReportStatus[]> {
  const query = useQuery({
    queryKey: teacherQueryKeys.classReportStatuses(classId, date),
    queryFn: () => orpc.reports.classStatuses({ classId, reportDate: date }),
    enabled: !!classId,
  });
  return { data: (query.data ?? []).map(toReportStatus), isPending: !!classId && query.isPending };
}

// --- Today overview (home) ------------------------------------------------

export type TodayOverview = {
  classCount: number;
  childCount: number;
  capacity: number;
  attendance: { here: number; total: number; late: number; absent: number; notIn: number };
  reports: { sent: number; expected: number };
  medsPending: number;
};

/** Aggregates the home dashboard numbers from the staff lists, scoped server-side
 *  to the teacher's classes. Mirrors the web's TeacherHome board. */
export function useTodayOverview(): Query<TodayOverview> {
  const centerId = useCenterId();
  const date = todayIsoDate();
  const classes = useTeacherClasses();

  const attendanceQuery = useQuery({
    queryKey: teacherQueryKeys.attendance(date),
    queryFn: () => orpc.attendance.staffList({ centerId: centerId ?? '', date }),
    enabled: !!centerId,
  });
  const medsQuery = useQuery({
    queryKey: teacherQueryKeys.medications(date),
    queryFn: () => orpc.medications.staffList({ centerId: centerId ?? '', date }),
    enabled: !!centerId,
  });

  const summary = attendanceQuery.data?.summary;
  const here = summary
    ? summary.present + summary.late + summary.leftEarly + summary.pickedUp
    : 0;
  const childCount = classes.data.reduce((sum, klass) => sum + klass.childCount, 0);

  const data: TodayOverview = {
    classCount: classes.data.length,
    childCount,
    capacity: classes.data.reduce((sum, klass) => sum + (klass.maxChildren ?? 0), 0),
    attendance: {
      here,
      total: summary?.total ?? childCount,
      late: summary?.late ?? 0,
      absent: summary ? summary.absent + summary.excused : 0,
      notIn: summary?.notCheckedIn ?? 0,
    },
    reports: { sent: 0, expected: childCount },
    medsPending: (medsQuery.data ?? []).filter((med) => med.status === 'pending').length,
  };

  const isPending =
    classes.isPending || (!!centerId && (attendanceQuery.isPending || medsQuery.isPending));
  return { data, isPending };
}

// --- Staff feature lists --------------------------------------------------

export function useStaffAttendance(date: string, classId?: string) {
  const centerId = useCenterId();
  return useQuery({
    queryKey: teacherQueryKeys.attendance(date, classId),
    queryFn: () =>
      orpc.attendance.staffList({
        centerId: centerId ?? '',
        date,
        classId: classId === 'all' ? undefined : classId,
      }),
    enabled: !!centerId,
  });
}

// --- Student documents ----------------------------------------------------

export type DocStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'needs_correction'
  | 'accepted'
  | 'closed';

export function useStaffDocuments(status?: DocStatus) {
  const centerId = useCenterId();
  return useQuery({
    queryKey: teacherQueryKeys.documents(status ?? 'all'),
    queryFn: () =>
      orpc.studentDocuments.staffSubmissions({ centerId: centerId ?? '', status }),
    enabled: !!centerId,
  });
}

// --- Join requests --------------------------------------------------------

export function useJoinRequests(status?: 'pending' | 'approved' | 'rejected') {
  const centerId = useCenterId();
  return useQuery({
    queryKey: teacherQueryKeys.joinRequests(status ?? 'all'),
    queryFn: () => orpc.director.joinRequests({ centerId: centerId ?? '', status }),
    enabled: !!centerId,
  });
}

/** Whether the signed-in teacher may act on join requests (director-granted). */
export function useCanApproveMembers(): boolean {
  const { session } = useAuth();
  return session?.membership.canApproveMembers ?? false;
}
