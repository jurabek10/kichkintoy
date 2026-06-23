"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Send, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { MealAudienceType, MealType } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { mealTypeLabelKey } from "./meal-labels";

const mealTypes: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

type MealBlock = {
  key: string;
  mealType: MealType;
  menuText: string;
  allergyNote: string;
  mediaAssetIds: string[];
  uploading: boolean;
};

let blockCounter = 0;
function makeBlock(mealType: MealType): MealBlock {
  blockCounter += 1;
  return {
    key: `block-${blockCounter}`,
    mealType,
    menuText: "",
    allergyNote: "",
    mediaAssetIds: [],
    uploading: false,
  };
}

export function MealComposer({
  centerId,
  director,
}: {
  centerId: string | null;
  director: boolean;
}) {
  const { t } = useLayoutTranslation("meals");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mealDate, setMealDate] = useState(todayIso());
  const [audienceType, setAudienceType] = useState<MealAudienceType>(
    director ? "center" : "class",
  );
  const [classIds, setClassIds] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<MealBlock[]>(() => [makeBlock("breakfast")]);
  const [error, setError] = useState<string | null>(null);

  const { data: audience } = useQuery({
    queryKey: queryKeys.meals.audience(centerId ?? ""),
    queryFn: () => orpc.meals.audience({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const usedTypes = blocks.map((block) => block.mealType);
  const nextType = mealTypes.find((type) => !usedTypes.includes(type));

  const createMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      // Each meal type is its own post; create them one after another so a
      // single submission publishes the whole day's menu.
      const created = [];
      for (const block of blocks) {
        const meal = await orpc.meals.create({
          centerId: centerId!,
          mealDate,
          mealType: block.mealType,
          audienceType,
          classIds: audienceType === "class" ? classIds : [],
          menuText: block.menuText.trim(),
          allergyNote: block.allergyNote.trim() || undefined,
          mediaAssetIds: block.mediaAssetIds,
          childStatuses: [],
          publish,
        });
        created.push(meal);
      }
      return created;
    },
    onSuccess: async (created, publish) => {
      toast.success(
        publish
          ? t("toast.mealsPublished", { count: created.length })
          : t("toast.mealsSaved", { count: created.length }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.meals.all() });
      router.push("/dashboard/meals");
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function updateBlock(key: string, patch: Partial<MealBlock>) {
    setBlocks((current) =>
      current.map((block) =>
        block.key === key ? { ...block, ...patch } : block,
      ),
    );
  }

  function addBlock() {
    if (!nextType) return;
    setBlocks((current) => [...current, makeBlock(nextType)]);
  }

  function removeBlock(key: string) {
    setBlocks((current) =>
      current.length === 1 ? current : current.filter((b) => b.key !== key),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(false);
  }

  function save(publish: boolean) {
    setError(null);
    if (!centerId) return setError(t("validation.centerRequired"));
    if (audienceType === "class" && classIds.length === 0) {
      return setError(t("validation.chooseClass"));
    }
    if (blocks.some((block) => !block.menuText.trim())) {
      return setError(t("validation.menuRequired"));
    }
    if (blocks.some((block) => block.uploading)) {
      return setError(t("validation.uploadInProgress"));
    }
    createMutation.mutate(publish);
  }

  async function uploadFiles(key: string, files: FileList | null) {
    if (!files || !centerId) return;
    setError(null);
    const block = blocks.find((b) => b.key === key);
    if (!block) return;
    updateBlock(key, { uploading: true });
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(
        0,
        10 - block.mediaAssetIds.length,
      )) {
        const signed = await orpc.media.createUploadUrl({
          centerId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          purpose: "meal",
        });
        const response = await fetch(signed.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) {
          throw new Error(
            t("validation.uploadFailedForFile", { file: file.name }),
          );
        }
        const asset = await orpc.media.completeUpload({
          mediaAssetId: signed.mediaAssetId,
        });
        uploaded.push(asset.id);
      }
      setBlocks((current) =>
        current.map((b) =>
          b.key === key
            ? {
                ...b,
                uploading: false,
                mediaAssetIds: [...b.mediaAssetIds, ...uploaded],
              }
            : b,
        ),
      );
      if (uploaded.length) {
        toast.success(t("toast.uploaded", { count: uploaded.length }));
      }
    } catch (err) {
      updateBlock(key, { uploading: false });
      setError(
        err instanceof Error ? err.message : t("validation.uploadFailed"),
      );
    }
  }

  function toggleClass(id: string, checked: boolean) {
    setClassIds((current) =>
      checked ? [...current, id] : current.filter((classId) => classId !== id),
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/meals">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("composer.newTitle")}</CardTitle>
          <CardDescription>{t("composer.dayDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="meal-date">{t("composer.date")}</Label>
            <DatePicker
              id="meal-date"
              value={mealDate}
              onValueChange={setMealDate}
            />
          </div>

          <div className="grid gap-3">
            <Label>{t("composer.audience")}</Label>
            <RadioGroup
              value={audienceType}
              onValueChange={(value) =>
                setAudienceType(value as MealAudienceType)
              }
              className="grid gap-2 sm:grid-cols-2"
            >
              {director ? (
                <AudienceOption
                  value="center"
                  label={t("audience.wholeCenter")}
                />
              ) : null}
              <AudienceOption
                value="class"
                label={t("audience.selectedClasses")}
              />
            </RadioGroup>
          </div>

          {audienceType === "class" ? (
            <div className="grid gap-2">
              <Label>{t("composer.classes")}</Label>
              <div className="grid max-h-60 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                {(audience?.classes ?? []).map((klass) => (
                  <label
                    key={klass.id}
                    className="flex items-center gap-2 rounded-md border p-3 text-sm"
                  >
                    <Checkbox
                      checked={classIds.includes(klass.id)}
                      onCheckedChange={(checked) =>
                        toggleClass(klass.id, checked === true)
                      }
                    />
                    <span className="font-semibold">{klass.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {blocks.map((block, index) => {
        // Offer each meal type once per submission.
        const typeOptions = mealTypes.filter(
          (type) => type === block.mealType || !usedTypes.includes(type),
        );
        return (
          <Card key={block.key}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Badge variant="secondary" className="tabular-nums">
                  {index + 1}
                </Badge>
                {t(mealTypeLabelKey(block.mealType))}
              </CardTitle>
              {blocks.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeBlock(block.key)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("composer.removeMeal")}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2 sm:max-w-xs">
                <Label>{t("composer.mealType")}</Label>
                <Select
                  value={block.mealType}
                  onValueChange={(value) =>
                    updateBlock(block.key, { mealType: value as MealType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(mealTypeLabelKey(type))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`menu-${block.key}`}>
                  {t("composer.menuText")}
                </Label>
                <Textarea
                  id={`menu-${block.key}`}
                  value={block.menuText}
                  onChange={(event) =>
                    updateBlock(block.key, { menuText: event.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`allergy-${block.key}`}>
                  {t("composer.allergyNote")}
                </Label>
                <Textarea
                  id={`allergy-${block.key}`}
                  value={block.allergyNote}
                  onChange={(event) =>
                    updateBlock(block.key, { allergyNote: event.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`photo-${block.key}`}>
                  {t("composer.foodPhotos")}
                </Label>
                <label className="grid cursor-pointer place-items-center gap-2 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground transition hover:border-primary/50">
                  <Upload className="h-6 w-6" />
                  <span>
                    {block.uploading
                      ? t("composer.uploading")
                      : t("composer.choosePhotos")}
                  </span>
                  <Input
                    id={`photo-${block.key}`}
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    multiple
                    className="sr-only"
                    disabled={block.uploading}
                    onChange={(event) =>
                      uploadFiles(block.key, event.target.files)
                    }
                  />
                </label>
                {block.mediaAssetIds.length ? (
                  <p className="text-sm text-muted-foreground">
                    {t("composer.uploadedFiles", {
                      count: block.mediaAssetIds.length,
                    })}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {nextType ? (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={addBlock}
        >
          <Plus className="h-4 w-4" />
          {t("composer.addMeal")}
        </Button>
      ) : null}

      <div className="sticky bottom-4 flex justify-end gap-2 rounded-md border bg-background p-3 shadow-pop">
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
          onClick={() => save(true)}
          disabled={createMutation.isPending}
        >
          <Send className="h-4 w-4" />
          {t("composer.publish")}
        </Button>
      </div>
    </form>
  );
}

function AudienceOption({
  value,
  label,
}: {
  value: MealAudienceType;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border p-3">
      <RadioGroupItem value={value} />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
