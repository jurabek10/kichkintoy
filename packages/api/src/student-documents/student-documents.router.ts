import { type ORPCDeps, type ORPCImplementer } from "../orpc/context";
import { createAccess } from "../orpc/access";

export function createStudentDocumentsRouter(
  os: ORPCImplementer,
  deps: ORPCDeps,
) {
  const access = createAccess(os, deps);
  return {
    staffTemplates: os.studentDocuments.staffTemplates.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.staffTemplates(context.user.id, input);
      },
    ),
    createTemplate: os.studentDocuments.createTemplate.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.createTemplate(context.user.id, input);
      },
    ),
    updateTemplate: os.studentDocuments.updateTemplate.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.updateTemplate(context.user.id, input);
      },
    ),
    archiveTemplate: os.studentDocuments.archiveTemplate.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.archiveTemplate(
          context.user.id,
          input.templateId,
        );
      },
    ),
    staffRequests: os.studentDocuments.staffRequests.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.staffRequests(context.user.id, input);
      },
    ),
    requestDetail: os.studentDocuments.requestDetail.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.requestDetail(context.user.id, input.requestId);
      },
    ),
    sendRequest: os.studentDocuments.sendRequest.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.sendRequest(context.user.id, input);
      },
    ),
    closeRequest: os.studentDocuments.closeRequest.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.closeRequest(context.user.id, input.requestId);
      },
    ),
    staffSubmissions: os.studentDocuments.staffSubmissions.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.staffSubmissions(context.user.id, input);
      },
    ),
    submissionDetail: os.studentDocuments.submissionDetail.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.submissionDetail(
          context.user.id,
          input.submissionId,
        );
      },
    ),
    reviewSubmission: os.studentDocuments.reviewSubmission.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.reviewSubmission(context.user.id, input);
      },
    ),
    parentRequests: os.studentDocuments.parentRequests.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.parentRequests(context.user.id, {
          childId: input?.childId,
          status: input?.status,
        });
      },
    ),
    parentSubmissionDetail: os.studentDocuments.parentSubmissionDetail.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.submissionDetail(
          context.user.id,
          input.submissionId,
        );
      },
    ),
    parentSaveDraft: os.studentDocuments.parentSaveDraft.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.parentSaveDraft(context.user.id, input);
      },
    ),
    parentSubmit: os.studentDocuments.parentSubmit.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.parentSubmit(context.user.id, input);
      },
    ),
    childSafetySummary: os.studentDocuments.childSafetySummary.use(access.authed).handler(
      async ({ input, context }) => {
        return deps.studentDocumentsService.childSafetySummary(
          context.user.id,
          input.childId,
        );
      },
    ),
  };
}
