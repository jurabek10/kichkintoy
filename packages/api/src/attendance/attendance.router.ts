import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createAttendanceRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    children: os.attendance.children.use(access.authed).handler(async ({ input, context }) => {
      return deps.attendanceService.children(context.user.id, input?.centerId);
    }),
    staffList: os.attendance.staffList.use(access.authed).handler(async ({ input, context }) => {
      return deps.attendanceService.listForStaff(context.user.id, input.centerId, {
        date: input.date,
        classId: input.classId,
        status: input.status,
      });
    }),
    parentList: os.attendance.parentList.use(access.authed).handler(async ({ input, context }) => {
      return deps.attendanceService.listForParent(context.user.id, {
        childId: input?.childId,
        from: input?.from,
        to: input?.to,
      });
    }),
    detail: os.attendance.detail.use(access.authed).handler(async ({ input, context }) => {
      return deps.attendanceService.get(context.user.id, input.recordId);
    }),
    checkIn: os.attendance.checkIn.use(access.authed).handler(async ({ input, context }) => {
      return deps.attendanceService.checkIn(context.user.id, input);
    }),
    checkOut: os.attendance.checkOut.use(access.authed).handler(async ({ input, context }) => {
      return deps.attendanceService.checkOut(context.user.id, input);
    }),
    markStatus: os.attendance.markStatus.use(access.authed).handler(async ({ input, context }) => {
      return deps.attendanceService.markStatus(context.user.id, input);
    }),
    parentSubmitAbsence: os.attendance.parentSubmitAbsence.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.attendanceService.parentSubmitAbsence(context.user.id, input);
      },
    ),
  };
}
