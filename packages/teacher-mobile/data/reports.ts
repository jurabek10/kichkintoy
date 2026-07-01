/**
 * Daily reports data access — the oRPC queries for the parent reports list and
 * detail, plus the mappers that turn the API responses into the view-model
 * shapes the screens render. Mirrors the web app's per-domain data pattern.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentChild, type Query } from '@/data/parent';
import i18n from '@/i18n';
import { useAuth } from '@/lib/auth';
import { formatDayMonthTime } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

// Derive the API shapes from the typed client so we never drift from the contract.
type ApiReportSummary = Awaited<ReturnType<typeof orpc.reports.parentList>>[number];
type ApiReportDetail = Awaited<ReturnType<typeof orpc.reports.teacherDetail>>;

// --- View models ----------------------------------------------------------

export type ReportSummary = {
  id: string;
  reportDate: string;
  authorName: string;
  className: string;
  mood: string | null;
  teacherNote: string;
  photoCount: number;
  commentCount: number;
};

export type ReportItem = { id: string; itemType: string; title: string | null; value: string };
export type ReportComment = { id: string; authorName: string; body: string; dateLabel: string };
export type ReportMedia = { id: string; mediaType: string };

export type ReportDetail = ReportSummary & {
  photos: ReportMedia[];
  items: ReportItem[];
  comments: ReportComment[];
};

/** Map a free-text mood (any language) to an emoji, defaulting to a calm face. */
const MOOD_EMOJI: { keywords: string[]; emoji: string }[] = [
  { keywords: ['happy', 'excited', 'energetic', 'joy', 'playful'], emoji: '😊' },
  { keywords: ['calm', 'content', 'good', 'well', 'fine'], emoji: '🙂' },
  { keywords: ['tired', 'sleepy', 'drowsy'], emoji: '😴' },
  { keywords: ['sad', 'tearful', 'cry', 'upset'], emoji: '😢' },
  { keywords: ['irritable', 'angry', 'fussy'], emoji: '😣' },
];

export function moodEmoji(mood: string | null): string {
  if (!mood) return '🙂';
  const lower = mood.toLowerCase();
  return MOOD_EMOJI.find((m) => m.keywords.some((k) => lower.includes(k)))?.emoji ?? '🙂';
}

// --- Mappers --------------------------------------------------------------

function toReportSummary(report: ApiReportSummary): ReportSummary {
  return {
    id: report.id,
    reportDate: report.reportDate,
    authorName: report.author.fullName,
    className: report.class.name,
    mood: report.mood,
    teacherNote: report.teacherNote ?? '',
    photoCount: report.photoCount,
    commentCount: report.commentCount,
  };
}

function toReportDetail(report: ApiReportDetail): ReportDetail {
  const lang = i18n.language;
  return {
    ...toReportSummary(report),
    photos: report.photos.map((media) => ({ id: media.id, mediaType: media.mediaType })),
    items: report.items.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      title: item.title,
      value: item.value ?? item.note ?? '',
    })),
    comments: report.comments
      .filter((comment) => !comment.deletedAt)
      .map((comment) => ({
        id: comment.id,
        authorName: comment.authorName,
        body: comment.body,
        dateLabel: formatDayMonthTime(comment.createdAt, lang),
      })),
  };
}

// --- Hooks ----------------------------------------------------------------

export function useChildReports(): Query<ReportSummary[]> {
  const child = useCurrentChild();
  const childId = child.data?.id ?? '';

  const query = useQuery({
    queryKey: queryKeys.parent.childReports(childId),
    queryFn: () => orpc.reports.parentList({ childId }),
    enabled: !!childId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  const data = (query.data ?? [])
    .filter((report) => report.status === 'published')
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
    .map(toReportSummary);

  return { data, isPending: child.isPending || (!!childId && query.isPending) };
}

export function useReport(reportId: string): Query<ReportDetail | null> {
  const query = useQuery({
    queryKey: queryKeys.reports.detail(reportId),
    queryFn: () => orpc.reports.parentDetail({ reportId }),
    enabled: !!reportId,
  });

  return { data: query.data ? toReportDetail(query.data) : null, isPending: query.isPending };
}

/** Post a comment on a report, then refresh the detail. */
export function useAddReportComment(reportId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const reportKey = queryKeys.reports.detail(reportId);

  return useMutation({
    mutationFn: (body: string) => orpc.reports.parentComment({ reportId, body: { body } }),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: reportKey });
      const previous = queryClient.getQueryData<ApiReportDetail>(reportKey);
      const now = new Date().toISOString();
      const optimisticId = `optimistic-${Date.now()}`;

      queryClient.setQueryData<ApiReportDetail>(reportKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          commentCount: current.commentCount + 1,
          comments: [
            ...current.comments,
            {
              id: optimisticId,
              authorUserId: session?.user.id ?? optimisticId,
              authorName: session?.user.fullName ?? '',
              parentCommentId: null,
              body,
              deletedAt: null,
              createdAt: now,
              updatedAt: now,
            },
          ],
        };
      });

      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(reportKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: reportKey }),
  });
}
