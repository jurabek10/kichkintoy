"use client";

import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ChildGender, ParentChild } from "@kichkintoy/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { ChildAvatar } from "./child-avatar";

const GENDERS: ChildGender[] = ["boy", "girl"];

/**
 * One child's details shown and edited inline (like the Profile card), so a
 * parent sees their child's info up front without opening a dialog.
 */
export function ChildCard({
  child,
  ringClassName,
}: {
  child: ParentChild;
  ringClassName?: string;
}) {
  const { t } = useLayoutTranslation("profile");
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(child.firstName);
  const [lastName, setLastName] = useState(child.lastName ?? "");
  const [dob, setDob] = useState(child.dateOfBirth ?? "");
  const [gender, setGender] = useState<ChildGender | null>(child.gender);
  const [allergies, setAllergies] = useState(child.allergies ?? "");
  const [medicalNotes, setMedicalNotes] = useState(child.medicalNotes ?? "");

  function cacheChild(next: ParentChild) {
    queryClient.setQueryData(
      queryKeys.profile.children(),
      (list: ParentChild[] | undefined) =>
        list?.map((c) => (c.id === next.id ? next : c)),
    );
    void queryClient.invalidateQueries({ queryKey: ["media", "download"] });
  }

  const save = useMutation({
    mutationFn: () =>
      orpc.profile.updateChild({
        childId: child.id,
        body: {
          firstName,
          lastName: lastName.trim() ? lastName.trim() : null,
          dateOfBirth: dob,
          gender,
          allergies: allergies.trim() ? allergies.trim() : null,
          medicalNotes: medicalNotes.trim() ? medicalNotes.trim() : null,
        },
      }),
    onSuccess: (next) => {
      cacheChild(next);
      setError(null);
      toast.success(t("toasts.childSaved"));
    },
    onError: (err) => setError(toApiError(err).message),
  });

  const removePhoto = useMutation({
    mutationFn: () => orpc.profile.removeChildPhoto({ childId: child.id }),
    onSuccess: (next) => {
      cacheChild(next);
      toast.success(t("toasts.childPhotoRemoved"));
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  async function onPhotoSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file || !child.centerId) return;
    setPhotoBusy(true);
    try {
      const signed = await orpc.media.createUploadUrl({
        centerId: child.centerId,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        purpose: "child_profile",
      });
      const response = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(t("errors.uploadFailed"));
      await orpc.media.completeUpload({ mediaAssetId: signed.mediaAssetId });
      const next = await orpc.profile.updateChildPhoto({
        childId: child.id,
        mediaAssetId: signed.mediaAssetId,
      });
      cacheChild(next);
      toast.success(t("toasts.childPhotoUpdated"));
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setPhotoBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  const location = [child.centerName, child.className]
    .filter(Boolean)
    .join(" · ");
  const hasPhoto = Boolean(child.photoMediaAssetId || child.photoUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{child.name}</CardTitle>
        <CardDescription>
          {location ? `${location} · ` : ""}
          {t("children.managedByCenter")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex w-28 shrink-0 flex-col items-center gap-2">
            <div className="relative h-24 w-24">
              <ChildAvatar
                mediaAssetId={child.photoMediaAssetId}
                photoUrl={child.photoUrl}
                name={child.name}
                className="h-24 w-24"
                ringClassName={ringClassName}
              />
              <button
                type="button"
                aria-label={t("child.photo")}
                title={t("child.photo")}
                disabled={photoBusy || !child.centerId}
                onClick={() => inputRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
              </button>
              {photoBusy ? (
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
              onChange={(event) => void onPhotoSelected(event.target.files)}
            />
            {hasPhoto ? (
              <button
                type="button"
                disabled={photoBusy || removePhoto.isPending}
                onClick={() => removePhoto.mutate()}
                className="text-xs font-medium text-destructive hover:underline disabled:opacity-60"
              >
                {t("actions.removePhoto")}
              </button>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`firstName-${child.id}`}>
                  {t("child.firstName")}
                </Label>
                <Input
                  id={`firstName-${child.id}`}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`lastName-${child.id}`}>
                  {t("child.lastName")}
                </Label>
                <Input
                  id={`lastName-${child.id}`}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`dob-${child.id}`}>{t("child.birthDate")}</Label>
                <Input
                  id={`dob-${child.id}`}
                  type="date"
                  value={dob}
                  onChange={(event) => setDob(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("child.gender")}</Label>
                <div className="flex rounded-xl bg-muted p-1">
                  {GENDERS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGender(option)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
                        gender === option
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      {t(`child.${option}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`allergies-${child.id}`}>
                {t("child.allergies")}
              </Label>
              <Textarea
                id={`allergies-${child.id}`}
                rows={2}
                value={allergies}
                onChange={(event) => setAllergies(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`medicalNotes-${child.id}`}>
                {t("child.medicalNotes")}
              </Label>
              <Textarea
                id={`medicalNotes-${child.id}`}
                rows={2}
                value={medicalNotes}
                onChange={(event) => setMedicalNotes(event.target.value)}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={save.isPending}>
                {t("actions.save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
