import { requireUser, type ORPCDeps, type ORPCImplementer } from "../context";

export function createStudentDocumentsRouter(
  os: ORPCImplementer,
  deps: ORPCDeps,
) {
  return {
    staffTemplates: os.studentDocuments.staffTemplates.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.staffTemplates(user.id, input);
      },
    ),
    createTemplate: os.studentDocuments.createTemplate.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.createTemplate(user.id, input);
      },
    ),
    updateTemplate: os.studentDocuments.updateTemplate.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.updateTemplate(user.id, input);
      },
    ),
    archiveTemplate: os.studentDocuments.archiveTemplate.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.archiveTemplate(
          user.id,
          input.templateId,
        );
      },
    ),
    staffRequests: os.studentDocuments.staffRequests.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.staffRequests(user.id, input);
      },
    ),
    requestDetail: os.studentDocuments.requestDetail.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.requestDetail(user.id, input.requestId);
      },
    ),
    sendRequest: os.studentDocuments.sendRequest.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.sendRequest(user.id, input);
      },
    ),
    closeRequest: os.studentDocuments.closeRequest.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.closeRequest(user.id, input.requestId);
      },
    ),
    staffSubmissions: os.studentDocuments.staffSubmissions.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.staffSubmissions(user.id, input);
      },
    ),
    submissionDetail: os.studentDocuments.submissionDetail.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.submissionDetail(
          user.id,
          input.submissionId,
        );
      },
    ),
    reviewSubmission: os.studentDocuments.reviewSubmission.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.reviewSubmission(user.id, input);
      },
    ),
    parentRequests: os.studentDocuments.parentRequests.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.parentRequests(user.id, {
          childId: input?.childId,
          status: input?.status,
        });
      },
    ),
    parentSubmissionDetail: os.studentDocuments.parentSubmissionDetail.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.submissionDetail(
          user.id,
          input.submissionId,
        );
      },
    ),
    parentSaveDraft: os.studentDocuments.parentSaveDraft.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.parentSaveDraft(user.id, input);
      },
    ),
    parentSubmit: os.studentDocuments.parentSubmit.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.parentSubmit(user.id, input);
      },
    ),
    childSafetySummary: os.studentDocuments.childSafetySummary.handler(
      async ({ input, context }) => {
        const user = await requireUser(deps.prisma, context.req);
        return deps.studentDocumentsService.childSafetySummary(
          user.id,
          input.childId,
        );
      },
    ),
  };
}
