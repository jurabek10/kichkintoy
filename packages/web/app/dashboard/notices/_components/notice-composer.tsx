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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toApiError } from "@/lib/api/errors";
import { noticeAudienceLabel } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

export function NoticeComposer({
  centerId,
  director,
}: {
  centerId: string | null;
  director: boolean;
}) {
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
      toast.success(publish ? "Notice published." : "Notice saved as draft.");
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
    if (!centerId) return setError("Your account is not linked to a center.");
    if (!title.trim()) return setError("Title is required.");
    if (!body.trim()) return setError("Body is required.");
    if (targetType !== "center" && targetIds.length === 0) {
      return setError("Choose at least one audience target.");
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
          Back to notices
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">New notice</CardTitle>
          <CardDescription>
            Send one operational message to a center, classes, or selected
            children.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="notice-title">Title</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notice-body">Body</Label>
            <Textarea
              id="notice-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
            />
          </div>

          <div className="grid gap-3">
            <Label>Audience</Label>
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
              <Label>{noticeAudienceLabel(targetType)}</Label>
              <div className="grid max-h-64 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                {choices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No available{" "}
                    {targetType === "class" ? "classes" : "children"}.
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
              label="Requires confirmation"
              checked={requiresConfirmation}
              onCheckedChange={setRequiresConfirmation}
            />
            <ToggleRow
              label="Allow comments"
              checked={allowComments}
              onCheckedChange={setAllowComments}
            />
            {director ? (
              <ToggleRow
                label="Pin notice"
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
            ) : null}
            <ToggleRow
              label="Important"
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
          Save draft
        </Button>
        <Button
          type="button"
          disabled={createMutation.isPending}
          onClick={() => save(true)}
        >
          <Send className="h-4 w-4" />
          Publish
        </Button>
      </div>
    </form>
  );
}

function AudienceOption({ value }: { value: NoticeTargetType }) {
  return (
    <label className="flex items-center gap-2 rounded-md border p-3">
      <RadioGroupItem value={value} />
      <span className="text-sm font-semibold">
        {noticeAudienceLabel(value)}
      </span>
    </label>
  );
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
