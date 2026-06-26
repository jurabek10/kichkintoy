"use client";

import { ImageIcon } from "lucide-react";
import type { AlbumMedia } from "@kichkintoy/shared";
import { SignedAlbumImage } from "./signed-album-image";

/**
 * Kidsnote-style album preview: one large photo beside two stacked, with a "+N"
 * badge on the last tile when the album holds more than is shown. Fills its
 * parent's height, so the caller sizes it (here, a 16/10 hero frame). A single
 * photo spans the whole frame; an empty album shows a quiet placeholder.
 */
export function AlbumMosaic({
  previewMedia,
  mediaCount,
}: {
  previewMedia: AlbumMedia[];
  mediaCount: number;
}) {
  const [big, ...rest] = previewMedia;
  const small = rest.slice(0, 2);
  const remaining = mediaCount - (1 + small.length);

  if (!big) {
    return (
      <div className="grid h-full w-full place-items-center bg-muted">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full gap-1 bg-card">
      <div className="relative flex-1 overflow-hidden">
        <SignedAlbumImage
          mediaAssetId={big.assetId}
          className="h-full w-full object-cover"
        />
      </div>
      {small.length > 0 ? (
        <div className="flex w-2/5 flex-col gap-1">
          {small.map((media, index) => (
            <div key={media.id} className="relative flex-1 overflow-hidden">
              <SignedAlbumImage
                mediaAssetId={media.assetId}
                className="h-full w-full object-cover"
              />
              {index === small.length - 1 && remaining > 0 ? (
                <div className="absolute inset-0 grid place-items-center bg-black/45">
                  <span className="text-lg font-extrabold text-white">
                    +{remaining}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
