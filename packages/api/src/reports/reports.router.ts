import { type ORPCImplementer, type ORPCDeps } from "../orpc/context";
import { createAccess } from "../orpc/access";
import {
  dailyReportClassChildStatusSchema,
  parentChildSummarySchema,
} from "@kichkintoy/shared";

export function createReportsRouter(os: ORPCImplementer, deps: ORPCDeps) {
  const access = createAccess(os, deps);
  return {
    teacherList: os.reports.teacherList.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.reportsService.listTeacherReports(context.user.id, input.reportDate);
      },
    ),
    create: os.reports.create.use(access.authed).handler(async ({ input, context }) => {
      return deps.reportsService.createReport(context.user.id, input);
    }),
    teacherDetail: os.reports.teacherDetail.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.reportsService.getReportForStaff(context.user.id, input.reportId);
      },
    ),
    update: os.reports.update.use(access.authed).handler(async ({ input, context }) => {
      return deps.reportsService.updateReport(
        context.user.id,
        input.reportId,
        input.body,
      );
    }),
    publish: os.reports.publish.use(access.authed).handler(async ({ input, context }) => {
      return deps.reportsService.publishReport(
        context.user.id,
        input.reportId,
        input.body,
      );
    }),
    unpublish: os.reports.unpublish.use(access.authed).handler(async ({ input, context }) => {
      return deps.reportsService.unpublishReport(context.user.id, input.reportId);
    }),
    delete: os.reports.delete.use(access.authed).handler(async ({ input, context }) => {
      return deps.reportsService.deleteReport(context.user.id, input.reportId);
    }),
    bulkCreateDrafts: os.reports.bulkCreateDrafts.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.reportsService.bulkCreateDrafts(
          context.user.id,
          input.classId,
          input.body,
        );
      },
    ),
    publishDrafts: os.reports.publishDrafts.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.reportsService.publishClassDrafts(
          context.user.id,
          input.classId,
          input.body,
        );
      },
    ),
    classStatuses: os.reports.classStatuses.use(access.authed).handler(
      async ({ input, context }) => {
        return dailyReportClassChildStatusSchema
          .array()
          .parse(
            await deps.reportsService.listClassReportStatuses(
              context.user.id,
              input.classId,
              input.reportDate,
            ),
          );
      },
    ),
    reads: os.reports.reads.use(access.authed).handler(async ({ input, context }) => {
      return deps.reportsService.listReads(context.user.id, input.reportId);
    }),
    staffComment: os.reports.staffComment.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.reportsService.addComment(
          context.user.id,
          input.reportId,
          input.body,
        );
      },
    ),
    parentChildren: os.reports.parentChildren.use(access.authed).handler(
      async ({ context }) => {
        return parentChildSummarySchema
          .array()
          .parse(await deps.reportsService.listParentChildren(context.user.id));
      },
    ),
    parentList: os.reports.parentList.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.reportsService.listParentReports(context.user.id, input.childId);
      },
    ),
    parentDetail: os.reports.parentDetail.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.reportsService.getReportForParent(context.user.id, input.reportId);
      },
    ),
    parentComment: os.reports.parentComment.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.reportsService.addComment(
          context.user.id,
          input.reportId,
          input.body,
        );
      },
    ),
    deleteComment: os.reports.deleteComment.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.reportsService.deleteComment(
          context.user.id,
          input.reportId,
          input.commentId,
        );
      },
    ),
    generateNote: os.reports.generateNote.use(access.authed).handler(
      async ({ input, context }) => {
        const teacherNote = await deps.geminiService.generateTeacherNote(input);
        return { teacherNote };
      },
    ),
  };
}
