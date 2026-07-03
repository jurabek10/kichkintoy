import type { CommentAuthorDisplay } from "@kichkintoy/shared";
import type { PrismaService } from "../database/prisma.service";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `avatar_url` / `photo_url` hold a media-asset id once uploaded; older rows may
 *  hold a direct URL. Split into the two shapes the clients understand. */
function splitPhoto(value: string | null | undefined): {
  authorPhotoMediaAssetId: string | null;
  authorPhotoUrl: string | null;
} {
  if (!value) return { authorPhotoMediaAssetId: null, authorPhotoUrl: null };
  return UUID_PATTERN.test(value)
    ? { authorPhotoMediaAssetId: value, authorPhotoUrl: null }
    : { authorPhotoMediaAssetId: null, authorPhotoUrl: value };
}

/** Split a stored `avatar_url` / `photo_url` into the media-asset id or legacy
 *  URL shape the clients render (for author bylines, avatars, etc.). */
export function splitPhotoRef(value: string | null | undefined): {
  photoMediaAssetId: string | null;
  photoUrl: string | null;
} {
  if (!value) return { photoMediaAssetId: null, photoUrl: null };
  return UUID_PATTERN.test(value)
    ? { photoMediaAssetId: value, photoUrl: null }
    : { photoMediaAssetId: null, photoUrl: value };
}

export type CommentAuthorInput = { userId: string; fullName: string };
/** The child to show for a parent author in this context (already resolved). */
export type ParentChildInfo = { name: string; photoUrl: string | null };

/**
 * Resolve how each comment author should be displayed: center staff show their
 * own name + avatar; a parent shows the child they guard in this context (the
 * caller supplies that child via `parentChild`). Batches the role + avatar
 * lookups so a comment thread costs two queries, not N.
 */
export async function resolveCommentAuthors(
  prisma: PrismaService,
  params: {
    centerId: string;
    authors: CommentAuthorInput[];
    parentChild: (userId: string) => ParentChildInfo | null;
  },
): Promise<Map<string, CommentAuthorDisplay>> {
  const result = new Map<string, CommentAuthorDisplay>();
  const ids = [...new Set(params.authors.map((a) => a.userId))];
  if (ids.length === 0) return result;

  const center = await prisma.center.findUnique({
    where: { id: params.centerId },
    select: { organizationId: true },
  });
  const staffRoles = center
    ? await prisma.userRole.findMany({
        where: {
          userId: { in: ids },
          role: { name: { in: ["director", "teacher", "organization_owner"] } },
          OR: [
            { centerId: params.centerId },
            { organizationId: center.organizationId, centerId: null },
          ],
        },
        select: { userId: true, role: { select: { name: true } } },
      })
    : [];
  const roleByUser = new Map<string, "director" | "teacher">();
  for (const row of staffRoles) {
    const role = row.role.name === "teacher" ? "teacher" : "director";
    // Prefer the stronger role if a user somehow has both.
    if (roleByUser.get(row.userId) !== "director") roleByUser.set(row.userId, role);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true, avatarUrl: true },
  });
  const avatarByUser = new Map(users.map((u) => [u.id, u.avatarUrl] as const));
  const nameByUser = new Map(users.map((u) => [u.id, u.fullName] as const));

  for (const { userId, fullName } of params.authors) {
    if (result.has(userId)) continue;
    const staffRole = roleByUser.get(userId);
    if (staffRole) {
      result.set(userId, {
        authorRole: staffRole,
        authorDisplayName: nameByUser.get(userId) ?? fullName,
        ...splitPhoto(avatarByUser.get(userId)),
      });
      continue;
    }
    // Parent: show the child they guard in this context, not their own name.
    const child = params.parentChild(userId);
    result.set(userId, {
      authorRole: "parent",
      authorDisplayName: child?.name ?? nameByUser.get(userId) ?? fullName,
      ...splitPhoto(child?.photoUrl ?? null),
    });
  }

  return result;
}

/** The resolved display for one comment, or a safe fallback (the author's own
 *  name, no photo) if resolution somehow missed it. */
export function commentAuthorFallback(
  comment: { authorUser: { fullName: string } },
  display: CommentAuthorDisplay | undefined,
): CommentAuthorDisplay {
  return (
    display ?? {
      authorRole: "parent",
      authorDisplayName: comment.authorUser.fullName,
      authorPhotoMediaAssetId: null,
      authorPhotoUrl: null,
    }
  );
}
