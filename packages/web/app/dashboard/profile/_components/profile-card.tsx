"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import type { ProfileView } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
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
import { updateStoredUser } from "@/lib/session";
import { AvatarUploader } from "./avatar-uploader";
import { ChangePhoneDialog } from "./change-phone-dialog";

export function ProfileCard({ profile }: { profile: ProfileView }) {
  const { t } = useLayoutTranslation("profile");
  const { t: tCommon } = useLayoutTranslation("common");
  const queryClient = useQueryClient();

  const isTeacher = profile.teacher !== null;
  const isParent = profile.role === "parent";
  const [fullName, setFullName] = useState(profile.fullName);
  const [username, setUsername] = useState(profile.username ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [bio, setBio] = useState(profile.teacher?.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      let next = await orpc.profile.updateProfile({
        fullName,
        username,
        email,
        preferredLanguage: profile.preferredLanguage,
      });
      if (isTeacher) {
        next = await orpc.profile.updateTeacherProfile({
          bio: bio.trim() ? bio.trim() : null,
        });
      }
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.profile.me(), next);
      updateStoredUser({ fullName: next.fullName, username: next.username });
      setError(null);
      toast.success(t("toasts.profileSaved"));
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.title")}</CardTitle>
        <CardDescription>{t("profile.subtitle")}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Parents don't have their own photo — their child's photo is the
              hero of the page. Directors and teachers keep a profile avatar. */}
          {isParent ? null : <AvatarUploader profile={profile} />}

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {tCommon(`roles.${profile.role}`)}
              </Badge>
              {profile.centerName ? (
                <span className="text-sm text-muted-foreground">
                  {profile.centerName}
                </span>
              ) : null}
              {profile.teacher?.employeeNumber ? (
                <span className="text-sm text-muted-foreground">
                  · {t("fields.employeeNumber")}:{" "}
                  {profile.teacher.employeeNumber}
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("fields.fullName")}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t("fields.username")}</Label>
                <Input
                  id="username"
                  value={username}
                  minLength={3}
                  maxLength={40}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("fields.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("fields.emailPlaceholder")}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("fields.phone")}</Label>
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {profile.phone ?? "—"}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPhoneOpen(true)}
                >
                  {t("actions.changePhone")}
                </Button>
              </div>
            </div>

            {isTeacher ? (
              <div className="space-y-2">
                <Label htmlFor="bio">{t("fields.bio")}</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  maxLength={280}
                  placeholder={t("fields.bioPlaceholder")}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t("fields.bioHint", { count: 280 - bio.length })}
                </p>
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {t("actions.save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </form>

      <ChangePhoneDialog open={phoneOpen} onOpenChange={setPhoneOpen} />
    </Card>
  );
}
