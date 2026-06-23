"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ProfileView } from "@kichkintoy/shared";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { SignedAvatar } from "@/components/signed-avatar";

export function AvatarUploader({ profile }: { profile: ProfileView }) {
  const { t } = useLayoutTranslation("profile");
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function applyProfile(next: ProfileView) {
    queryClient.setQueryData(queryKeys.profile.me(), next);
    // Drop any cached signed URL for the previous asset.
    void queryClient.invalidateQueries({ queryKey: ["media", "download"] });
  }

  const removeMutation = useMutation({
    mutationFn: () => orpc.profile.removeAvatar({}),
    onSuccess: (next) => {
      applyProfile(next);
      toast.success(t("toasts.avatarRemoved"));
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  async function onFileSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file || !profile.centerId) return;
    setBusy(true);
    try {
      const signed = await orpc.media.createUploadUrl({
        centerId: profile.centerId,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        purpose: "user_avatar",
      });
      const response = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(t("errors.uploadFailed"));
      await orpc.media.completeUpload({ mediaAssetId: signed.mediaAssetId });
      const next = await orpc.profile.updateAvatar({
        mediaAssetId: signed.mediaAssetId,
      });
      applyProfile(next);
      toast.success(t("toasts.avatarUpdated"));
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex w-28 shrink-0 flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <SignedAvatar
          mediaAssetId={profile.avatarMediaAssetId}
          name={profile.fullName}
          className="h-24 w-24"
          textClassName="text-2xl"
        />

        <button
          type="button"
          aria-label={t("actions.changePhoto")}
          title={t("actions.changePhoto")}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Camera className="h-4 w-4" />
        </button>

        {busy ? (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void onFileSelected(event.target.files)}
      />

      {profile.avatarMediaAssetId ? (
        <button
          type="button"
          disabled={busy || removeMutation.isPending}
          onClick={() => removeMutation.mutate()}
          className="text-xs font-medium text-destructive hover:underline disabled:opacity-60"
        >
          {t("actions.removePhoto")}
        </button>
      ) : null}
    </div>
  );
}
