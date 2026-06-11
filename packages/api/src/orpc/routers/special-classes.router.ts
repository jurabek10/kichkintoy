import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createSpecialClassesRouter(
  os: ORPCImplementer,
  deps: ORPCDeps,
) {
  return {
    subjects: os.specialClasses.subjects.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.specialClassesService.subjects(user.id, input);
    }),
    createSubject: os.specialClasses.createSubject.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.createSubject(user.id, input);
      },
    ),
    updateSubject: os.specialClasses.updateSubject.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.updateSubject(user.id, input);
      },
    ),
    archiveSubject: os.specialClasses.archiveSubject.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.archiveSubject(user.id, input.subjectId);
      },
    ),
    specialists: os.specialClasses.specialists.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.specialists(user.id, input);
      },
    ),
    createSpecialist: os.specialClasses.createSpecialist.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.createSpecialist(user.id, input);
      },
    ),
    updateSpecialist: os.specialClasses.updateSpecialist.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.updateSpecialist(user.id, input);
      },
    ),
    archiveSpecialist: os.specialClasses.archiveSpecialist.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.archiveSpecialist(
          user.id,
          input.specialistTeacherId,
        );
      },
    ),
    rubrics: os.specialClasses.rubrics.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.specialClassesService.rubrics(user.id, input);
    }),
    upsertRubric: os.specialClasses.upsertRubric.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.upsertRubric(user.id, input);
      },
    ),
    schedules: os.specialClasses.schedules.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.specialClassesService.schedules(user.id, input);
    }),
    createSchedule: os.specialClasses.createSchedule.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.createSchedule(user.id, input);
      },
    ),
    updateSchedule: os.specialClasses.updateSchedule.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.updateSchedule(user.id, input);
      },
    ),
    archiveSchedule: os.specialClasses.archiveSchedule.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.archiveSchedule(user.id, input.scheduleId);
      },
    ),
    staffSessions: os.specialClasses.staffSessions.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.staffSessions(user.id, input);
      },
    ),
    sessionDetail: os.specialClasses.sessionDetail.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.sessionDetail(user.id, input.sessionId);
      },
    ),
    createSession: os.specialClasses.createSession.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.createSession(user.id, input);
      },
    ),
    updateSession: os.specialClasses.updateSession.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.updateSession(user.id, input);
      },
    ),
    publishSession: os.specialClasses.publishSession.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.publishSession(user.id, input.sessionId);
      },
    ),
    cancelSession: os.specialClasses.cancelSession.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.cancelSession(user.id, input.sessionId);
      },
    ),
    upsertChildObservations:
      os.specialClasses.upsertChildObservations.handler(
        async ({ input, context }) => {
          const user = await requireUser(deps.prisma, context.req);
          return deps.specialClassesService.upsertChildObservations(
            user.id,
            input,
          );
        },
      ),
    attachMedia: os.specialClasses.attachMedia.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.attachMedia(user.id, input);
      },
    ),
    parentFeed: os.specialClasses.parentFeed.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.parentFeed(user.id, input);
      },
    ),
    parentSessionDetail: os.specialClasses.parentSessionDetail.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.parentSessionDetail(
          user.id,
          input.sessionId,
          input.childId,
        );
      },
    ),
    comments: os.specialClasses.comments.handler(async ({ input, context }) => {
      const user = await requireUser(deps.prisma, context.req);
      return deps.specialClassesService.comments(user.id, input);
    }),
    addComment: os.specialClasses.addComment.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.addComment(user.id, input);
      },
    ),
    monthlyProgress: os.specialClasses.monthlyProgress.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.monthlyProgress(user.id, input);
      },
    ),
    generateAiSummary: os.specialClasses.generateAiSummary.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.generateAiSummary(user.id, input);
      },
    ),
    updateSummaryDraft: os.specialClasses.updateSummaryDraft.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.updateSummaryDraft(user.id, input);
      },
    ),
    approveSummary: os.specialClasses.approveSummary.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.approveSummary(user.id, input);
      },
    ),
    createPdfPortfolio: os.specialClasses.createPdfPortfolio.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.createPdfPortfolio(user.id, input);
      },
    ),
    portfolioDownloadUrl: os.specialClasses.portfolioDownloadUrl.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.portfolioDownloadUrl(
          user.id,
          input.exportId,
        );
      },
    ),
    payrollReport: os.specialClasses.payrollReport.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.payrollReport(user.id, input);
      },
    ),
    updateSessionPayroll: os.specialClasses.updateSessionPayroll.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.specialClassesService.updateSessionPayroll(user.id, input);
      },
    ),
  };
}
