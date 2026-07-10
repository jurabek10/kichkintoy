/**
 * Notices (공지사항) data access — the oRPC queries for the parent notices list
 * and detail, plus the mappers that turn the API responses into the view-model
 * shapes the screens render, and the confirm mutation. Mirrors the daily
 * reports data layer.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Query } from '@/data/parent';
import { formatTime, localIsoDate } from '@/lib/date';
// formatTime / localIsoDate render in Uzbekistan time (UTC+5).
import { useCurrentChild } from '@/data/parent';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

// Derive the API shapes from the typed client so we never drift from the contract.
type ApiNoticeSummary = Awaited<ReturnType<typeof orpc.notices.parentList>>[number];
type ApiNoticeDetail = Awaited<ReturnType<typeof orpc.notices.parentDetail>>;

// --- View models ----------------------------------------------------------

export type NoticeAudience = 'center' | 'class' | 'child';

export type NoticeSummary = {
  id: string;
  title: string;
  bodyPreview: string;
  authorName: string;
  authorPhoto: string | null;
  centerName: string;
  audience: NoticeAudience;
  isPinned: boolean;
  isImportant: boolean;
  requiresConfirmation: boolean;
  allowComments: boolean;
  isRead: boolean; // this parent has opened it
  isConfirmed: boolean; // this parent has confirmed it
  publishedDate: string; // local "YYYY-MM-DD"
  time: string; // "11:13"
};

export type NoticeCommentView = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  deleted: boolean;
  photoMediaAssetId: string | null;
  photoUrl: string | null;
};

export type NoticeDetail = NoticeSummary & {
  body: string;
  isConfirmed: boolean;
  comments: NoticeCommentView[];
};

// --- Mappers --------------------------------------------------------------

/** Uzbekistan "HH:mm" for a publish timestamp, blank when not yet published. */
function timeLabel(iso: string | null): string {
  return iso ? formatTime(iso) : '';
}

function toNoticeSummary(notice: ApiNoticeSummary): NoticeSummary {
  return {
    id: notice.id,
    title: notice.title,
    bodyPreview: notice.bodyPreview,
    authorName: notice.author.fullName,
    authorPhoto: notice.author.photoMediaAssetId ?? notice.author.photoUrl,
    centerName: notice.centerName,
    audience: notice.targetType,
    isPinned: notice.isPinned,
    isImportant: notice.isImportant,
    requiresConfirmation: notice.requiresConfirmation,
    allowComments: notice.allowComments,
    isRead: !!notice.myReadAt,
    isConfirmed: !!notice.myConfirmedAt,
    publishedDate: notice.publishedAt ? localIsoDate(notice.publishedAt) : '',
    time: timeLabel(notice.publishedAt),
  };
}

function toNoticeDetail(notice: ApiNoticeDetail): NoticeDetail {
  return {
    ...toNoticeSummary(notice),
    body: notice.body,
    isConfirmed: !!notice.myConfirmedAt,
    comments: notice.comments.map((comment) => ({
      id: comment.id,
      authorName: comment.authorDisplayName,
      photoMediaAssetId: comment.authorPhotoMediaAssetId,
      photoUrl: comment.authorPhotoUrl,
      body: comment.deletedAt ? '' : comment.body,
      createdAt: comment.createdAt,
      deleted: !!comment.deletedAt,
    })),
  };
}

// --- Hooks ----------------------------------------------------------------

export function useNotices(): Query<NoticeSummary[]> {
  // Scoped to the globally selected kid so a kid at a different kindergarten
  // reads that center's notices.
  const child = useCurrentChild();
  const childId = child.data?.id ?? '';
  const query = useQuery({
    queryKey: [...queryKeys.notices.parentList, childId],
    queryFn: () => orpc.notices.parentChildList({ childId }),
    enabled: !!childId,
  });

  const data = (query.data ?? [])
    .filter((notice) => notice.status === 'published')
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
    })
    .map(toNoticeSummary);

  return { data, isPending: child.isPending || (!!childId && query.isPending) };
}

export function useNotice(noticeId: string): Query<NoticeDetail | null> {
  const query = useQuery({
    queryKey: queryKeys.notices.detail(noticeId),
    queryFn: () => orpc.notices.parentDetail({ noticeId }),
    enabled: !!noticeId,
  });

  return { data: query.data ? toNoticeDetail(query.data) : null, isPending: query.isPending };
}

/** Confirm a notice that requires confirmation, then refresh its detail. */
export function useConfirmNotice(noticeId: string) {
  const queryClient = useQueryClient();
  const noticeKey = queryKeys.notices.detail(noticeId);

  return useMutation({
    mutationFn: () => orpc.notices.confirm({ noticeId }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: noticeKey });
      const previous = queryClient.getQueryData<ApiNoticeDetail>(noticeKey);

      queryClient.setQueryData<ApiNoticeDetail>(noticeKey, (current) => {
        if (!current) return current;
        const now = new Date().toISOString();
        return { ...current, myReadAt: current.myReadAt ?? now, myConfirmedAt: now };
      });

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(noticeKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: noticeKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.notices.parentList });
    },
  });
}

/** Post a comment on a notice, then refresh its detail thread. */
export function useAddNoticeComment(noticeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      orpc.notices.addComment({ noticeId, body: { body } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notices.detail(noticeId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notices.parentList });
    },
  });
}
