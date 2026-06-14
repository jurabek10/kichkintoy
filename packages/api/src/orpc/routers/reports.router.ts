import { requireUser, type ORPCImplementer, type ORPCDeps } from "../context";
import {
  dailyReportClassChildStatusSchema,
  parentChildSummarySchema,
} from "@kichkintoy/shared";

export function createReportsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  return {
    teacherList: os.reports.teacherList.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.reportsService.listTeacherReports(user.id, input.reportDate);
      },
    ),
    create: os.reports.create.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.reportsService.createReport(user.id, input);
    }),
    teacherDetail: os.reports.teacherDetail.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.reportsService.getReportForStaff(user.id, input.reportId);
      },
    ),
    update: os.reports.update.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.reportsService.updateReport(
        user.id,
        input.reportId,
        input.body,
      );
    }),
    publish: os.reports.publish.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.reportsService.publishReport(
        user.id,
        input.reportId,
        input.body,
      );
    }),
    unpublish: os.reports.unpublish.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.reportsService.unpublishReport(user.id, input.reportId);
    }),
    delete: os.reports.delete.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.reportsService.deleteReport(user.id, input.reportId);
    }),
    bulkCreateDrafts: os.reports.bulkCreateDrafts.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.reportsService.bulkCreateDrafts(
          user.id,
          input.classId,
          input.body,
        );
      },
    ),
    publishDrafts: os.reports.publishDrafts.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.reportsService.publishClassDrafts(
          user.id,
          input.classId,
          input.body,
        );
      },
    ),
    classStatuses: os.reports.classStatuses.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return dailyReportClassChildStatusSchema
          .array()
          .parse(
            await deps.reportsService.listClassReportStatuses(
              user.id,
              input.classId,
              input.reportDate,
            ),
          );
      },
    ),
    reads: os.reports.reads.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.reportsService.listReads(user.id, input.reportId);
    }),
    staffComment: os.reports.staffComment.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.reportsService.addComment(
          user.id,
          input.reportId,
          input.body,
        );
      },
    ),
    parentChildren: os.reports.parentChildren.handler(
      async ({ context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return parentChildSummarySchema
          .array()
          .parse(await deps.reportsService.listParentChildren(user.id));
      },
    ),
    parentList: os.reports.parentList.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.reportsService.listParentReports(user.id, input.childId);
      },
    ),
    parentDetail: os.reports.parentDetail.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.reportsService.getReportForParent(user.id, input.reportId);
      },
    ),
    parentComment: os.reports.parentComment.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.reportsService.addComment(
          user.id,
          input.reportId,
          input.body,
        );
      },
    ),
    deleteComment: os.reports.deleteComment.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.reportsService.deleteComment(
          user.id,
          input.reportId,
          input.commentId,
        );
      },
    ),
    generateNote: os.reports.generateNote.handler(
      async ({ input, context }) => {
        await requireUser(deps.prisma, context.req);
        const teacherNote = await deps.geminiService.generateTeacherNote(input);
        return { teacherNote };
      },
    ),
  };
}
