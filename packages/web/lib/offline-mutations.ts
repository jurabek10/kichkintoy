import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "./orpc";

export type ReportCommentVars = {
  reportId: string;
  isParent: boolean;
  body: string;
  attachmentMediaAssetIds: string[];
  idempotencyKey: string;
};

// A stable key (not an inline closure) so a comment queued while offline can be
// rehydrated from persisted storage and replayed after a reload.
export const REPORT_COMMENT_MUTATION_KEY = [
  "offline",
  "report-comment",
] as const;

// Register resumable, offline-capable mutation defaults on the browser client.
// TanStack pauses these while offline; persistence keeps the queued mutation
// across reloads; resumePausedMutations() replays it when connectivity returns.
// The idempotency key makes the replay safe (server applies it at most once).
export function registerOfflineMutations(queryClient: QueryClient) {
  queryClient.setMutationDefaults(REPORT_COMMENT_MUTATION_KEY, {
    mutationFn: async (vars: ReportCommentVars) => {
      const input = {
        reportId: vars.reportId,
        body: { body: vars.body, attachmentMediaAssetIds: vars.attachmentMediaAssetIds, idempotencyKey: vars.idempotencyKey },
      };
      return vars.isParent
        ? orpc.reports.parentComment(input)
        : orpc.reports.staffComment(input);
    },
  });
}
