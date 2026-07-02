/**
 * Albums (앨범) data access — staff/author side. The oRPC queries and mutations a
 * teacher uses to share, publish, and moderate class photo posts, plus the
 * mappers that turn API responses into the view-model shapes the screens render.
 * Mirrors the web dashboard albums feature; the server scopes the staff list and
 * audience to the classes she teaches.
 */
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateAlbumPostInput } from '@kichkintoy/shared';
import type { Query } from '@/data/parent';
import i18n from '@/i18n';
import { useCenterId } from '@/data/teacher';
import { formatDayMonthTime, formatLongDate, formatTime, localIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { queryKeys, teacherQueryKeys } from '@/lib/query-keys';

// Derive the API shapes from the typed client so we never drift from the contract.
type ApiAlbumSummary = Awaited<ReturnType<typeof orpc.albums.staffList>>[number];
type ApiAlbumDetail = Awaited<ReturnType<typeof orpc.albums.detail>>;
type ApiAudience = Awaited<ReturnType<typeof orpc.albums.audience>>;

// --- View models ----------------------------------------------------------

export type AlbumMedia = { id: string; assetId: string; mediaType: string };
export type AlbumStatus = 'draft' | 'published';
export type AlbumVisibility = 'class' | 'tagged_children';

export type StaffAlbumSummary = {
  id: string;
  caption: string;
  title: string;
  bodyPreview: string;
  authorName: string;
  classes: { id: string; name: string }[];
  className: string;
  status: AlbumStatus;
  visibility: AlbumVisibility;
  mediaCount: number;
  heartCount: number;
  commentCount: number;
  cover: AlbumMedia | null;
  previewMedia: AlbumMedia[];
  /** Raw instant the album reads as (publish time, or last edit for a draft). */
  dateIso: string;
  /** Local "YYYY-MM-DD" of dateIso, for period filtering. */
  dateKey: string;
  /** Long, localized date for display. */
  dateLabel: string;
  timeLabel: string;
};

export type AlbumCommentView = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  dateLabel: string;
  deleted: boolean;
};

export type StaffAlbumDetail = StaffAlbumSummary & {
  authorId: string;
  allowComments: boolean;
  taggedChildren: { id: string; name: string }[];
  myReacted: boolean;
  media: AlbumMedia[];
  comments: AlbumCommentView[];
};

/** Split a caption into its title (first line) and body (the rest). */
export function splitCaption(caption: string): { title: string; body: string } {
  const [title, ...rest] = caption.split('\n');
  return { title: (title ?? '').trim(), body: rest.join('\n').trim() };
}

// --- Mappers --------------------------------------------------------------

function toMedia(media: { id: string; assetId: string; mediaType: string }): AlbumMedia {
  return { id: media.id, assetId: media.assetId, mediaType: media.mediaType };
}

/** The album's display title: caption's first line, else a body preview. */
function albumTitle(post: ApiAlbumSummary): string {
  return splitCaption(post.caption).title || post.bodyPreview || '';
}

function toSummary(post: ApiAlbumSummary): StaffAlbumSummary {
  const lang = i18n.language;
  const dateIso = post.publishedAt ?? post.updatedAt;
  return {
    id: post.id,
    caption: post.caption,
    title: albumTitle(post),
    bodyPreview: post.bodyPreview,
    authorName: post.author.fullName,
    classes: post.classes.map((klass) => ({ id: klass.id, name: klass.name })),
    className: post.classes.map((klass) => klass.name).join(', '),
    status: post.status,
    visibility: post.visibility,
    mediaCount: post.mediaCount,
    heartCount: post.reactionSummary.heartCount,
    commentCount: post.commentCount,
    cover: post.coverMedia ? toMedia(post.coverMedia) : null,
    previewMedia: (post.previewMedia ?? (post.coverMedia ? [post.coverMedia] : [])).map(toMedia),
    dateIso,
    dateKey: localIsoDate(dateIso),
    dateLabel: formatLongDate(localIsoDate(dateIso), lang),
    timeLabel: post.publishedAt ? formatTime(post.publishedAt) : '',
  };
}

function toDetail(post: ApiAlbumDetail): StaffAlbumDetail {
  const lang = i18n.language;
  return {
    ...toSummary(post),
    authorId: post.author.id,
    allowComments: post.allowComments,
    taggedChildren: post.children.map((child) => ({ id: child.id, name: child.name })),
    myReacted: post.reactionSummary.myReaction !== null,
    media: post.media.map(toMedia),
    comments: post.comments.map((comment) => ({
      id: comment.id,
      authorId: comment.authorUserId,
      authorName: comment.authorName,
      body: comment.deletedAt ? '' : comment.body,
      dateLabel: formatDayMonthTime(comment.createdAt, lang),
      deleted: !!comment.deletedAt,
    })),
  };
}

// --- Hooks ----------------------------------------------------------------

/** The teacher's albums, newest first. */
export function useStaffAlbums(): Query<StaffAlbumSummary[]> {
  const centerId = useCenterId();
  const query = useQuery({
    queryKey: teacherQueryKeys.albums,
    queryFn: () => orpc.albums.staffList({ centerId: centerId ?? '' }),
    enabled: !!centerId,
  });
  const data = (query.data ?? [])
    .slice()
    .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt))
    .map(toSummary);
  return { data, isPending: !!centerId && query.isPending };
}

export function useStaffAlbum(postId: string): Query<StaffAlbumDetail | null> {
  const query = useQuery({
    queryKey: albumDetailKey(postId),
    queryFn: () => orpc.albums.detail({ postId }),
    enabled: !!postId,
  });
  return { data: query.data ? toDetail(query.data) : null, isPending: !!postId && query.isPending };
}

/** Classes and children the teacher may share to, split by kind. */
export function useAlbumAudience(): Query<ApiAudience> {
  const centerId = useCenterId();
  const query = useQuery({
    queryKey: [...teacherQueryKeys.albums, 'audience', centerId] as const,
    queryFn: () => orpc.albums.audience({ centerId: centerId ?? '' }),
    enabled: !!centerId,
  });
  return {
    data: query.data ?? { classes: [], children: [] },
    isPending: !!centerId && query.isPending,
  };
}

/** Create an album post — saved as a draft or published straight away. */
export function useCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAlbumPostInput) => orpc.albums.create(input),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.albums });
      queryClient.setQueryData(albumDetailKey(post.id), post);
    },
  });
}

/** Publish a draft album now. */
export function usePublishAlbum(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpc.albums.publish({ postId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: albumDetailKey(postId) });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.albums });
    },
  });
}

/** Delete an album, then refresh the list. */
export function useDeleteAlbum(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => orpc.albums.delete({ postId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherQueryKeys.albums }),
  });
}

/** Post a comment, then refresh the detail thread. */
export function useAddAlbumComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => orpc.albums.addComment({ postId, body: { body } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: albumDetailKey(postId) }),
  });
}

/** Toggle the heart reaction, reconciling with the server result. */
export function useToggleAlbumReaction(postId: string) {
  const queryClient = useQueryClient();
  const albumKey = albumDetailKey(postId);
  return useMutation({
    mutationFn: () => orpc.albums.toggleReaction({ postId }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: albumKey });
      const previous = queryClient.getQueryData<ApiAlbumDetail>(albumKey);
      queryClient.setQueryData<ApiAlbumDetail>(albumKey, (current) => {
        if (!current) return current;
        const reacted = current.reactionSummary.myReaction !== null;
        return {
          ...current,
          reactionSummary: {
            heartCount: current.reactionSummary.heartCount + (reacted ? -1 : 1),
            myReaction: reacted ? null : 'heart',
          },
        };
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(albumKey, context.previous);
    },
    onSuccess: (summary) => {
      queryClient.setQueryData<ApiAlbumDetail>(albumKey, (current) =>
        current ? { ...current, reactionSummary: summary } : current,
      );
    },
  });
}

/** Resolve signed download URLs for a set of album media, aligned to input order. */
export function useSignedAlbumUrls(media: AlbumMedia[]): (string | null)[] {
  const results = useQueries({
    queries: media.map((item) => ({
      queryKey: queryKeys.media.download(item.assetId),
      queryFn: () => orpc.media.getDownloadUrl({ mediaAssetId: item.assetId }),
      staleTime: 4 * 60 * 1000,
    })),
  });
  return results.map((result) => result.data?.downloadUrl ?? null);
}

/** Detail query key — scoped under the teacher albums namespace. */
function albumDetailKey(postId: string) {
  return [...teacherQueryKeys.albums, 'detail', postId] as const;
}
