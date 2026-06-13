"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Save } from "lucide-react";
import { toast } from "sonner";
import type {
  NoticeAudienceResponse,
  NoticeTargetType,
} from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

export function NoticeComposer({
  centerId,
  director,
}: {
  centerId: string | null;
  director: boolean;
}) {
  const { t } = useLayoutTranslation("notices");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<NoticeTargetType>(
    director ? "center" : "class",
  );
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: audience } = useQuery({
    queryKey: queryKeys.notices.audience(centerId ?? ""),
    queryFn: () => orpc.notices.audience({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const choices = useMemo<
    NoticeAudienceResponse["classes"] | NoticeAudienceResponse["children"]
  >(
    () =>
      (targetType === "class" ? audience?.classes : audience?.children) ?? [],
    [audience, targetType],
  );

  const createMutation = useMutation({
    mutationFn: (publish: boolean) =>
      orpc.notices.create({
        centerId: centerId!,
        title,
        body,
        targetType,
        targetIds: targetType === "center" ? [] : targetIds,
        requiresConfirmation,
        allowComments,
        isPinned,
        isImportant,
        publish,
      }),
    onSuccess: async (notice, publish) => {
      toast.success(
        publish ? t("toast.published") : t("toast.savedAsDraft"),
      );
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
      router.push(`/dashboard/notices/${notice.id}`);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(false);
  }

  function save(publish: boolean) {
    setError(null);
    if (!centerId) return setError(t("validation.centerRequired"));
    if (!title.trim()) return setError(t("validation.titleRequired"));
    if (!body.trim()) return setError(t("validation.bodyRequired"));
    if (targetType !== "center" && targetIds.length === 0) {
      return setError(t("validation.targetRequired"));
    }
    createMutation.mutate(publish);
  }

  function setTarget(value: NoticeTargetType) {
    setTargetType(value);
    setTargetIds([]);
  }

  function toggleTarget(id: string, checked: boolean) {
    setTargetIds((current) =>
      checked
        ? [...current, id]
        : current.filter((targetId) => targetId !== id),
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/notices">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("composer.newTitle")}</CardTitle>
          <CardDescription>{t("composer.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="notice-title">{t("composer.title")}</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notice-body">{t("composer.body")}</Label>
            <Textarea
              id="notice-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
            />
          </div>

          <div className="grid gap-3">
            <Label>{t("composer.audience")}</Label>
            <RadioGroup
              value={targetType}
              onValueChange={(value) => setTarget(value as NoticeTargetType)}
              className="grid gap-2 sm:grid-cols-3"
            >
              {director ? <AudienceOption value="center" /> : null}
              <AudienceOption value="class" />
              <AudienceOption value="child" />
            </RadioGroup>
          </div>

          {targetType !== "center" ? (
            <div className="grid gap-2">
              <Label>{t(targetTypeLabelKey(targetType))}</Label>
              <div className="grid max-h-64 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                {choices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {targetType === "class"
                      ? t("composer.noClasses")
                      : t("composer.noChildren")}
                  </p>
                ) : (
                  choices.map((choice) => (
                    <label
                      key={choice.id}
                      className="flex items-start gap-2 rounded-md border p-3 text-sm"
                    >
                      <Checkbox
                        checked={targetIds.includes(choice.id)}
                        onCheckedChange={(checked) =>
                          toggleTarget(choice.id, checked === true)
                        }
                      />
                      <span>
                        <span className="block font-semibold">
                          {choice.name}
                        </span>
                        {"className" in choice && choice.className ? (
                          <span className="text-xs text-muted-foreground">
                            {choice.className}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow
              label={t("composer.requiresConfirmation")}
              checked={requiresConfirmation}
              onCheckedChange={setRequiresConfirmation}
            />
            <ToggleRow
              label={t("composer.allowComments")}
              checked={allowComments}
              onCheckedChange={setAllowComments}
            />
            {director ? (
              <ToggleRow
                label={t("composer.pinNotice")}
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
            ) : null}
            <ToggleRow
              label={t("composer.important")}
              checked={isImportant}
              onCheckedChange={setIsImportant}
            />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end gap-2 rounded-lg border bg-background p-3 shadow-card">
        <Button
          type="submit"
          variant="outline"
          disabled={createMutation.isPending}
        >
          <Save className="h-4 w-4" />
          {t("composer.saveDraft")}
        </Button>
        <Button
          type="button"
          disabled={createMutation.isPending}
          onClick={() => save(true)}
        >
          <Send className="h-4 w-4" />
          {t("composer.publish")}
        </Button>
      </div>
    </form>
  );
}

function AudienceOption({ value }: { value: NoticeTargetType }) {
  const { t } = useLayoutTranslation("notices");
  return (
    <label className="flex items-center gap-2 rounded-md border p-3">
      <RadioGroupItem value={value} />
      <span className="text-sm font-semibold">
        {t(targetTypeLabelKey(value))}
      </span>
    </label>
  );
}

function targetTypeLabelKey(value: NoticeTargetType) {
  if (value === "center") return "audience.center";
  if (value === "class") return "audience.class";
  return "audience.child";
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm font-semibold">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
