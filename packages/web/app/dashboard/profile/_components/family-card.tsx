"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, Send, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { ChildAvatar } from "./child-avatar";

const RELATIONSHIPS = [
  "father",
  "mother",
  "grandfather",
  "grandmother",
  "other",
] as const;
type Relationship = (typeof RELATIONSHIPS)[number];

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "KichkintoyUzBot";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const groupCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

const formatExpiry = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(",", "");

// `users.avatarUrl` holds either a media-asset id or a legacy URL; ChildAvatar
// takes them as separate props, so split here the same way mobile's ProfileAvatar does.
const avatarProps = (value: string | null) =>
  value && UUID_RE.test(value)
    ? { mediaAssetId: value, photoUrl: null }
    : { mediaAssetId: null, photoUrl: value };

export function FamilyCard() {
  const { t } = useLayoutTranslation("profile");
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [relationship, setRelationship] = useState<Relationship>("father");
  const [created, setCreated] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<
    | { kind: "remove"; userId: string; name: string }
    | { kind: "revoke"; invitationId: string }
    | null
  >(null);

  const family = useQuery({
    queryKey: queryKeys.family.all(),
    queryFn: () => orpc.family.listGuardians({}),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.family.all() });

  const create = useMutation({
    mutationFn: () => orpc.family.createInvitation({ relationship }),
    onSuccess: (result) => {
      setCreated(result);
      void refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });
  const revoke = useMutation({
    mutationFn: (invitationId: string) =>
      orpc.family.revokeInvitation({ invitationId }),
    onSuccess: () => {
      setPendingConfirm(null);
      void refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => orpc.family.removeGuardian({ userId }),
    onSuccess: () => {
      setPendingConfirm(null);
      void refresh();
    },
    onError: (error) => toast.error(toApiError(error).message),
  });

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    toast.success(t("family.invite.copied"));
  };
  const copyShareMessage = (code: string) => {
    void navigator.clipboard.writeText(
      t("family.invite.shareMessage", { bot: BOT, code }),
    );
    toast.success(t("family.invite.copied"));
  };

  const children = family.data?.children ?? [];
  const canManage = family.data?.canManage ?? false;
  const allAtCap =
    children.length > 0 &&
    children.every((child) => child.guardians.length >= 3);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight">
            {t("family.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("family.subtitle")}
          </p>
        </div>
        {canManage ? (
          <div className="text-right">
            <Button
              disabled={allAtCap}
              onClick={() => {
                setCreated(null);
                setRelationship("father");
                setInviteOpen(true);
              }}
            >
              <Users className="h-4 w-4" />
              {t("family.invite.cta")}
            </Button>
            {allAtCap ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("family.invite.capReached")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {family.isPending ? (
        <Card>
          <CardContent className="py-6">
            <KidsLoader label={t("family.title")} size="sm" />
          </CardContent>
        </Card>
      ) : family.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {toApiError(family.error).message}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {children.map((child) => (
            <Card key={child.id} className="overflow-hidden py-0">
              <div className="border-b bg-muted/50 px-4 py-3">
                <p className="font-bold">{child.fullName}</p>
              </div>
              <CardContent className="divide-y px-0 pb-0">
                {child.guardians.map((guardian) => (
                  <div
                    key={guardian.userId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <ChildAvatar
                      {...avatarProps(guardian.avatarUrl)}
                      name={guardian.fullName}
                      className="h-10 w-10"
                      ringClassName="ring-sky"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {guardian.fullName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">
                          {t(`family.relationship.${guardian.relationship}`)}
                        </Badge>
                        {guardian.isPrimary ? (
                          <Badge className="bg-mint text-mint-ink">
                            {t("family.primary")}
                          </Badge>
                        ) : null}
                        {guardian.telegramUsername ? (
                          <span className="text-xs text-muted-foreground">
                            @{guardian.telegramUsername}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {canManage && !guardian.isPrimary ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setPendingConfirm({
                            kind: "remove",
                            userId: guardian.userId,
                            name: guardian.fullName,
                          })
                        }
                      >
                        {t("family.remove.action")}
                      </Button>
                    ) : null}
                  </div>
                ))}
                {child.guardians.length <= 1 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    {t("family.empty")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}

          {canManage && (family.data?.pendingInvitations.length ?? 0) > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("family.pendingTitle")}
              </p>
              <Card className="py-0">
                <CardContent className="divide-y px-0">
                  {family.data?.pendingInvitations.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="font-mono text-lg font-extrabold tracking-[3px]"
                          onClick={() => copyCode(invite.code)}
                          title={t("family.invite.copied")}
                        >
                          {groupCode(invite.code)}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {t(`family.relationship.${invite.relationship}`)} ·{" "}
                          {t("family.invite.expires", {
                            date: formatExpiry(invite.expiresAt),
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#229ED9] hover:text-[#229ED9]"
                        title={t("family.invite.share")}
                        onClick={() => copyShareMessage(invite.code)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title={t("family.invite.revoke")}
                        onClick={() =>
                          setPendingConfirm({
                            kind: "revoke",
                            invitationId: invite.id,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}

      {/* Invite dialog: relationship picker, then the code view with share steps. */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          {created ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  {t("family.invite.cta")}
                </DialogTitle>
              </DialogHeader>
              <button
                type="button"
                className="mx-auto font-mono text-4xl font-black tracking-[6px]"
                onClick={() => copyCode(created.code)}
                title={t("family.invite.copied")}
              >
                {groupCode(created.code)}
              </button>
              <ol className="space-y-1.5 text-sm">
                <li>1. {t("family.invite.step1", { bot: BOT })}</li>
                <li>2. {t("family.invite.step2")}</li>
                <li>3. {t("family.invite.step3")}</li>
              </ol>
              <p className="text-center text-xs text-muted-foreground">
                {t("family.invite.expires", {
                  date: formatExpiry(created.expiresAt),
                })}
              </p>
              <Button
                className="w-full bg-[#229ED9] text-white hover:bg-[#1d8bc0]"
                onClick={() => copyShareMessage(created.code)}
              >
                <Copy className="h-4 w-4" />
                {t("family.invite.share")}
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("family.invite.cta")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {RELATIONSHIPS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRelationship(item)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm font-semibold transition-colors ${
                      relationship === item
                        ? "border-primary bg-accent"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {t(`family.relationship.${item}`)}
                    {relationship === item ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : null}
                  </button>
                ))}
              </div>
              <Button
                className="w-full"
                disabled={create.isPending}
                onClick={() => create.mutate()}
              >
                {t("family.invite.create")}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Shared destructive confirm for remove-guardian and revoke-invitation. */}
      <Dialog
        open={pendingConfirm !== null}
        onOpenChange={(next) => (next ? null : setPendingConfirm(null))}
      >
        <DialogContent className="max-w-sm gap-4">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <DialogTitle className="text-center">
              {pendingConfirm?.kind === "remove"
                ? t("family.remove.confirmTitle")
                : t("family.invite.revokeConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {pendingConfirm?.kind === "remove"
                ? t("family.remove.confirmBody", { name: pendingConfirm.name })
                : t("family.invite.revokeConfirmBody")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setPendingConfirm(null)}>
              {t("actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending || revoke.isPending}
              onClick={() => {
                if (!pendingConfirm) return;
                if (pendingConfirm.kind === "remove")
                  remove.mutate(pendingConfirm.userId);
                else revoke.mutate(pendingConfirm.invitationId);
              }}
            >
              {pendingConfirm?.kind === "remove"
                ? t("family.remove.action")
                : t("family.invite.revoke")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
