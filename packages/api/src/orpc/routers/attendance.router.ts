import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createAttendanceRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    children: os.attendance.children.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.attendanceService.children(user.id, input?.centerId);
    }),
    staffList: os.attendance.staffList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.attendanceService.listForStaff(user.id, input.centerId, {
        date: input.date,
        classId: input.classId,
        status: input.status,
      });
    }),
    parentList: os.attendance.parentList.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.attendanceService.listForParent(user.id, {
        childId: input?.childId,
        from: input?.from,
        to: input?.to,
      });
    }),
    detail: os.attendance.detail.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.attendanceService.get(user.id, input.recordId);
    }),
    checkIn: os.attendance.checkIn.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.attendanceService.checkIn(user.id, input);
    }),
    checkOut: os.attendance.checkOut.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.attendanceService.checkOut(user.id, input);
    }),
    markStatus: os.attendance.markStatus.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.attendanceService.markStatus(user.id, input);
    }),
    parentSubmitAbsence: os.attendance.parentSubmitAbsence.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.attendanceService.parentSubmitAbsence(user.id, input);
      },
    ),
  };
}
