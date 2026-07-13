/**
 * Albums (앨범) data access — the oRPC queries for the parent album list and
 * detail, the mappers that turn the API responses into the view-model shapes
 * the screens render, the signed-media resolver, plus the comment and reaction
 * mutations. Mirrors the daily reports / notices data layers.
 */
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CommentAttachment } from '@kichkintoy/shared';

import { useCurrentChild, type Query } from '@/data/parent';
import i18n from '@/i18n';
import { useAuth } from '@/lib/auth';
import { formatDayMonthTime, formatTime, localIsoDate } from '@/lib/date';
import { orpc } from '@/lib/orpc';
import { queryKeys } from '@/lib/query-keys';

// Derive the API shapes from the typed client so we never drift from the contract.
type ApiAlbumSummary = Awaited<ReturnType<typeof orpc.albums.parentList>>[number];
type ApiAlbumDetail = Awaited<ReturnType<typeof orpc.albums.detail>>;

// --- View models ----------------------------------------------------------

export type AlbumMedia = { id: string; assetId: string; mediaType: string };
export type AlbumComment = { id: string; authorName: string; body: string; dateLabel: string; photoMediaAssetId: string | null; photoUrl: string | null; attachments: CommentAttachment[] };

export type AlbumSummary = {
  id: string;
  centerId: string;
  caption: string; // first line = title, rest = body
  authorName: string;
  authorPhoto: string | null;
  className: string;
  classes: { id: string; name: string }[];
  heartCount: number;
  commentCount: number;
  mediaCount: number;
  publishedDate: string; // local "YYYY-MM-DD"
  time: string; // "14:16"
  cover: AlbumMedia | null;
  previewMedia: AlbumMedia[];
};

export type AlbumDetail = AlbumSummary & {
  taggedFamilies: number;
  allowComments: boolean;
  myReacted: boolean;
  media: AlbumMedia[];
  comments: AlbumComment[];
};

/** Split a caption into its title (first line) and body (the rest). */
export function splitCaption(caption: string): { title: string; body: string } {
  const [title, ...rest] = caption.split('\n');
  return { title: (title ?? '').trim(), body: rest.join('\n').trim() };
}

// --- Mappers --------------------------------------------------------------

function timeLabel(iso: string | null): string {
  if (!iso) return '';
  return formatTime(iso);
}

function toMedia(media: { id: string; assetId: string; mediaType: string }): AlbumMedia {
  return { id: media.id, assetId: media.assetId, mediaType: media.mediaType };
}

function className(classes: ApiAlbumSummary['classes']): string {
  return classes.map((cls) => cls.name).join(', ');
}

function toAlbumSummary(post: ApiAlbumSummary): AlbumSummary {
  return {
    id: post.id,
    centerId: post.centerId,
    caption: post.caption,
    authorName: post.author.fullName,
    authorPhoto: post.author.photoMediaAssetId ?? post.author.photoUrl,
    className: className(post.classes),
    classes: post.classes.map((cls) => ({ id: cls.id, name: cls.name })),
    heartCount: post.reactionSummary.heartCount,
    commentCount: post.commentCount,
    mediaCount: post.mediaCount,
    publishedDate: post.publishedAt ? localIsoDate(post.publishedAt) : '',
    time: timeLabel(post.publishedAt),
    cover: post.coverMedia ? toMedia(post.coverMedia) : null,
    previewMedia: (post.previewMedia ?? (post.coverMedia ? [post.coverMedia] : [])).map(toMedia),
  };
}

function toAlbumDetail(post: ApiAlbumDetail): AlbumDetail {
  const lang = i18n.language;
  return {
    ...toAlbumSummary(post),
    taggedFamilies: post.children.length,
    allowComments: post.allowComments,
    myReacted: post.reactionSummary.myReaction !== null,
    media: post.media.map(toMedia),
    comments: post.comments
      .filter((comment) => !comment.deletedAt)
      .map((comment) => ({
        id: comment.id,
        authorName: comment.authorDisplayName,
        photoMediaAssetId: comment.authorPhotoMediaAssetId,
        photoUrl: comment.authorPhotoUrl,
        body: comment.body,
        attachments: comment.attachments,
        dateLabel: formatDayMonthTime(comment.createdAt, lang),
      })),
  };
}

// --- Hooks ----------------------------------------------------------------

export function useAlbums(): Query<AlbumSummary[]> {
  const child = useCurrentChild();
  const childId = child.data?.id ?? '';

  const query = useQuery({
    queryKey: queryKeys.albums.parentList(childId),
    queryFn: () => orpc.albums.parentList({ childId }),
    enabled: !!childId,
  });

  const data = (query.data ?? [])
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .map(toAlbumSummary);

  return { data, isPending: child.isPending || (!!childId && query.isPending) };
}

export function useAlbum(postId: string): Query<AlbumDetail | null> {
  const query = useQuery({
    queryKey: queryKeys.albums.detail(postId),
    queryFn: () => orpc.albums.detail({ postId }),
    enabled: !!postId,
  });

  return { data: query.data ? toAlbumDetail(query.data) : null, isPending: query.isPending };
}

/** Resolve signed download URLs for a set of album media (shares the cache with
 *  any SignedAlbumImage rendering the same asset). Returns URLs aligned to the
 *  input order; entries are null until their query resolves. */
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

/** Post a comment on an album, then refresh the detail. */
export function useAddAlbumComment(postId: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const albumKey = queryKeys.albums.detail(postId);

  return useMutation({
    mutationFn: (input: { body: string; attachmentMediaAssetIds: string[] }) => orpc.albums.addComment({ postId, body: input }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: albumKey });
      const previous = queryClient.getQueryData<ApiAlbumDetail>(albumKey);
      const now = new Date().toISOString();
      const optimisticId = `optimistic-${Date.now()}`;

      queryClient.setQueryData<ApiAlbumDetail>(albumKey, (current) => {
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
              authorRole: 'parent' as const,
              authorDisplayName: session?.user.fullName ?? '',
              authorPhotoMediaAssetId: null,
              authorPhotoUrl: null,
              body: input.body,
              attachments: [],
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
      if (context?.previous) queryClient.setQueryData(albumKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: albumKey }),
  });
}

/** Toggle the heart reaction on an album, reconciling with the server result. */
export function useToggleAlbumReaction(postId: string) {
  const queryClient = useQueryClient();
  const albumKey = queryKeys.albums.detail(postId);

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
