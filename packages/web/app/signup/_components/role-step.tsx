"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Heart, ShieldCheck } from "lucide-react";
import type { PendingInvitation, UserRole } from "@kichkintoy/shared";
import { FormActions } from "@/components/form-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { facilityTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSignup } from "../SignupContext";

const options: Array<{
  value: UserRole;
  titleKey: string;
  descriptionKey: string;
  Icon: typeof Heart;
}> = [
  {
    value: "parent",
    titleKey: "signup.parent",
    descriptionKey: "signup.parentDesc",
    Icon: Heart,
  },
  {
    value: "teacher",
    titleKey: "signup.teacher",
    descriptionKey: "signup.teacherDesc",
    Icon: GraduationCap,
  },
  {
    value: "director",
    titleKey: "signup.director",
    descriptionKey: "signup.directorDesc",
    Icon: ShieldCheck,
  },
];

export function RoleStep() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const { draft, setDraft, acceptInvitation, declineInvitation } = useSignup();
  const [error, setError] = useState<string | null>(null);

  const { data: invitations = [], isPending: loadingInvites } = useQuery({
    queryKey: queryKeys.auth.invitations(draft.phoneVerificationToken ?? ""),
    queryFn: () =>
      orpc.auth.lookupInvitations({
        phoneVerificationToken: draft.phoneVerificationToken,
      }),
    enabled: !!draft.phoneVerificationToken,
  });

  useEffect(() => {
    if (!draft.phoneVerificationToken) {
      router.replace("/signup");
    }
  }, [draft.phoneVerificationToken, router]);

  function chooseRole(role: UserRole) {
    setError(null);
    setDraft((current) => ({
      ...current,
      role,
      ...(role !== "parent" && role !== "teacher"
        ? { invitationId: null, invitationLabel: null }
        : {}),
    }));
  }

  function next() {
    if (!draft.role) {
      setError(t("signup.errors.roleRequired"));
      return;
    }

    if (draft.role === "director") {
      router.push("/signup/director-setup");
      return;
    }

    if (draft.invitationId) {
      router.push(draft.role === "parent" ? "/signup/child" : "/signup/review");
      return;
    }

    router.push("/signup/center");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("signup.roleTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("signup.roleDescription")}
        </p>
      </header>

      {!loadingInvites && invitations.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-sand-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground/80">
            You have an invitation
          </p>
          {invitations.map((invitation) => {
            const accepted = draft.invitationId === invitation.id;
            return (
              <div
                key={invitation.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border bg-card p-4",
                  accepted
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border",
                )}
              >
                <div className="flex flex-col gap-1">
                  <p className="text-base font-bold">{invitation.center.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {facilityTypeLabel(invitation.center.facilityType as never)}
                    {invitation.class ? ` · ${invitation.class.name}` : ""} ·{" "}
                    You'll join as{" "}
                    <Badge variant="info" className="ml-1 capitalize">
                      {invitation.kind}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Invited by {invitation.invitedBy.fullName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {accepted ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={declineInvitation}
                    >
                      {t("actions.cancel")}
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        onClick={() => acceptInvitation(invitation)}
                      >
                        {t("actions.continue")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={declineInvitation}
                      >
                        {t("actions.cancel")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {options.map(({ value, titleKey, descriptionKey, Icon }) => {
          const selected = draft.role === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => chooseRole(value)}
              className={cn(
                "flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border hover:border-primary/40",
              )}
            >
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-base font-bold">{t(titleKey)}</span>
                <span className="text-sm text-muted-foreground">
                  {t(descriptionKey)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <FormActions
        back={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.back()}
          >
            {t("actions.back")}
          </Button>
        }
        next={
          <Button type="button" size="lg" className="w-full" onClick={next}>
            {t("actions.continue")}
          </Button>
        }
      />
    </div>
  );
}
