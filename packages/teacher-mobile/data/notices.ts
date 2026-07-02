/**
 * Notices (공지사항) data access — staff/author side. These are the oRPC queries
 * and mutations a teacher uses to compose, publish, and moderate the notices she
 * sends to parents, plus the mappers that turn API responses into the view-model
 * shapes the screens render. Mirrors the web dashboard notices feature; the
 * server already scopes the author list / audience to the classes she teaches.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateNoticeRequest } from '@kichkintoy/shared';
import type { Query } from '@/data/parent';
import i18n from '@/i18n';
import { formatDayMonth, formatDayMonthTime, formatTime, localIsoDate } from '@/lib/date';
// formatTime / formatDayMonth render in Uzbekistan time (UTC+5).
import { useCenterId } from '@/data/teacher';
import { orpc } from '@/lib/orpc';
import { teacherQueryKeys } from '@/lib/query-keys';

// Derive the API shapes from the typed client so we never drift from the contract.
type ApiNoticeSummary = Awaited<ReturnType<typeof orpc.notices.authorList>>[number];
type ApiNoticeDetail = Awaited<ReturnType<typeof orpc.notices.authorDetail>>;
type ApiAudience = Awaited<ReturnType<typeof orpc.notices.audience>>;

// --- View models ----------------------------------------------------------

export type NoticeStatus = 'draft' | 'scheduled' | 'published';
export type NoticeAudience = 'center' | 'class' | 'child';

export type StaffNoticeSummary = {
  id: string;
  title: string;
  bodyPreview: string;
  status: NoticeStatus;
  audience: NoticeAudience;
  /** First target's label (a class or child name), or '' for center-wide. */
  targetLabel: string;
  /** How many targets beyond the first, for a "+N" chip. */
  extraTargets: number;
  isPinned: boolean;
  isImportant: boolean;
  requiresConfirmation: boolean;
  readCount: number;
  recipientCount: number;
  confirmedCount: number;
  commentCount: number;
  /** "3-iyul" style date of the notice's last activity. */
  dateLabel: string;
  /** Raw timestamps kept for sorting (pinned-then-recent). */
  publishedAt: string | null;
  updatedAt: string;
};

export type NoticeRecipientView = {
  id: string;
  userName: string;
  childName: string | null;
  className: string | null;
  /** Formatted read time, or null when the parent hasn't opened it. */
  readLabel: string | null;
  confirmedLabel: string | null;
};

export type NoticeCommentView = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  dateLabel: string;
  deleted: boolean;
};

export type StaffNoticeDetail = StaffNoticeSummary & {
  body: string;
  authorId: string;
  authorName: string;
  allowComments: boolean;
  /** Long date + time the notice went (or will go) out. */
  publishedLabel: string;
  recipients: NoticeRecipientView[];
  comments: NoticeCommentView[];
};

// --- Mappers --------------------------------------------------------------

function activityIso(notice: ApiNoticeSummary): string {
  return notice.publishedAt ?? notice.updatedAt;
}

function toSummary(notice: ApiNoticeSummary): StaffNoticeSummary {
  const lang = i18n.language;
  return {
    id: notice.id,
    title: notice.title,
    bodyPreview: notice.bodyPreview,
    status: notice.status,
    audience: notice.targetType,
    targetLabel: notice.targets[0]?.label ?? '',
    extraTargets: Math.max(0, notice.targets.length - 1),
    isPinned: notice.isPinned,
    isImportant: notice.isImportant,
    requiresConfirmation: notice.requiresConfirmation,
    readCount: notice.readCount,
    recipientCount: notice.recipientCount,
    confirmedCount: notice.confirmedCount,
    commentCount: notice.commentCount,
    dateLabel: formatDayMonth(activityIso(notice), lang),
    publishedAt: notice.publishedAt,
    updatedAt: notice.updatedAt,
  };
}

function toDetail(notice: ApiNoticeDetail): StaffNoticeDetail {
  const lang = i18n.language;
  return {
    ...toSummary(notice),
    body: notice.body,
    authorId: notice.author.id,
    authorName: notice.author.fullName,
    allowComments: notice.allowComments,
    publishedLabel: notice.publishedAt
      ? formatDayMonthTime(notice.publishedAt, lang)
      : notice.scheduledAt
        ? formatDayMonthTime(notice.scheduledAt, lang)
        : formatDayMonth(notice.updatedAt, lang),
    recipients: notice.recipients.map((recipient) => ({
      id: recipient.id,
      userName: recipient.userName,
      childName: recipient.childName,
      className: recipient.className,
      readLabel: recipient.readAt ? formatDayMonthTime(recipient.readAt, lang) : null,
      confirmedLabel: recipient.confirmedAt
        ? formatDayMonthTime(recipient.confirmedAt, lang)
        : null,
    })),
    comments: notice.comments.map((comment) => ({
      id: comment.id,
      authorId: comment.authorUserId,
      authorName: comment.authorName,
      body: comment.deletedAt ? '' : comment.body,
      dateLabel: `${formatDayMonth(localIsoDate(comment.createdAt), lang)} · ${formatTime(comment.createdAt)}`,
      deleted: !!comment.deletedAt,
    })),
  };
}

/** Pinned notices float up; within a group, most recent activity first. */
function byPinnedThenRecent(a: StaffNoticeSummary, b: StaffNoticeSummary) {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  return (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt);
}

// --- Hooks ----------------------------------------------------------------

/** The teacher's own notices, sorted pinned-then-recent. */
export function useAuthorNotices(): Query<StaffNoticeSummary[]> {
  const centerId = useCenterId();
  const query = useQuery({
    queryKey: teacherQueryKeys.notices,
    queryFn: () => orpc.notices.authorList({ centerId: centerId ?? '' }),
    enabled: !!centerId,
  });
  const data = (query.data ?? []).map(toSummary).sort(byPinnedThenRecent);
  return { data, isPending: !!centerId && query.isPending };
}

export function useAuthorNotice(noticeId: string): Query<StaffNoticeDetail | null> {
  const query = useQuery({
    queryKey: queryKeys(noticeId),
    queryFn: () => orpc.notices.authorDetail({ noticeId }),
    enabled: !!noticeId,
  });
  return {
    data: query.data ? toDetail(query.data) : null,
    isPending: !!noticeId && query.isPending,
  };
}

/** Classes and children the teacher may target, split by kind. */
export function useNoticeAudience(): Query<ApiAudience> {
  const centerId = useCenterId();
  const query = useQuery({
    queryKey: [...teacherQueryKeys.notices, 'audience', centerId] as const,
    queryFn: () => orpc.notices.audience({ centerId: centerId ?? '' }),
    enabled: !!centerId,
  });
  return {
    data: query.data ?? { classes: [], children: [] },
    isPending: !!centerId && query.isPending,
  };
}

/** Compose a notice — saved as a draft or published straight away. */
export function useCreateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoticeRequest) => orpc.notices.create(input),
    onSuccess: (notice) => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.notices });
      queryClient.setQueryData(queryKeys(notice.id), notice);
    },
  });
}

/** Publish a draft or scheduled notice now. */
export function usePublishNotice(noticeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpc.notices.publish({ noticeId, body: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys(noticeId) });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.notices });
    },
  });
}

/** Delete a notice, then refresh the list. */
export function useDeleteNotice(noticeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpc.notices.delete({ noticeId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherQueryKeys.notices }),
  });
}

/** Post a comment on a notice, then refresh its detail thread. */
export function useAddNoticeComment(noticeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => orpc.notices.addComment({ noticeId, body: { body } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys(noticeId) }),
  });
}

/** Remove a comment (author's own, or any as a manager). */
export function useDeleteNoticeComment(noticeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => orpc.notices.deleteComment({ noticeId, commentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys(noticeId) }),
  });
}

/** Detail query key — scoped under the teacher notices namespace. */
function queryKeys(noticeId: string) {
  return [...teacherQueryKeys.notices, 'detail', noticeId] as const;
}
