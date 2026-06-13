"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import type {
  MealAudienceResponse,
  MealAudienceType,
  MealEatingStatus,
  MealType,
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
import { eatingStatusLabelKey, mealTypeLabelKey } from "./meal-labels";

const mealTypes: MealType[] = ["breakfast", "lunch", "snack", "dinner"];
const eatingStatuses: MealEatingStatus[] = [
  "ate_all",
  "ate_most",
  "ate_some",
  "did_not_eat",
];

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
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [audienceType, setAudienceType] = useState<MealAudienceType>(
    director ? "center" : "class",
  );
  const [classIds, setClassIds] = useState<string[]>([]);
  const [menuText, setMenuText] = useState("");
  const [allergyNote, setAllergyNote] = useState("");
  const [mediaAssetIds, setMediaAssetIds] = useState<string[]>([]);
  const [childStatuses, setChildStatuses] = useState<
    Record<string, MealEatingStatus | "">
  >({});
  const [error, setError] = useState<string | null>(null);

  const { data: audience } = useQuery({
    queryKey: queryKeys.meals.audience(centerId ?? ""),
    queryFn: () => orpc.meals.audience({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const visibleChildren = useMemo<MealAudienceResponse["children"]>(() => {
    if (!audience) return [];
    if (audienceType === "center") return audience.children;
    return audience.children.filter((child) =>
      child.classId ? classIds.includes(child.classId) : false,
    );
  }, [audience, audienceType, classIds]);

  const createMutation = useMutation({
    mutationFn: (publish: boolean) =>
      orpc.meals.create({
        centerId: centerId!,
        mealDate,
        mealType,
        audienceType,
        classIds: audienceType === "class" ? classIds : [],
        menuText,
        allergyNote: allergyNote || undefined,
        mediaAssetIds,
        childStatuses: Object.entries(childStatuses)
          .filter(([, status]) => status)
          .map(([childId, status]) => ({
            childId,
            status: status as MealEatingStatus,
          })),
        publish,
      }),
    onSuccess: async (meal, publish) => {
      toast.success(publish ? t("toast.published") : t("toast.savedAsDraft"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.meals.all() });
      router.push(`/dashboard/meals/${meal.id}`);
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
    if (!menuText.trim()) return setError(t("validation.menuRequired"));
    if (audienceType === "class" && classIds.length === 0) {
      return setError(t("validation.chooseClass"));
    }
    createMutation.mutate(publish);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || !centerId) return;
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(
        0,
        10 - mediaAssetIds.length,
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
      setMediaAssetIds((current) => [...current, ...uploaded]);
      if (uploaded.length) {
        toast.success(t("toast.uploaded", { count: uploaded.length }));
      }
    } catch (err) {
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
          <CardDescription>{t("composer.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="meal-date">{t("composer.date")}</Label>
              <DatePicker
                id="meal-date"
                value={mealDate}
                onValueChange={setMealDate}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("composer.mealType")}</Label>
              <Select
                value={mealType}
                onValueChange={(value) => setMealType(value as MealType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mealTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(mealTypeLabelKey(type))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="grid gap-2">
            <Label htmlFor="menu-text">{t("composer.menuText")}</Label>
            <Textarea
              id="menu-text"
              value={menuText}
              onChange={(event) => setMenuText(event.target.value)}
              rows={5}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="allergy-note">{t("composer.allergyNote")}</Label>
            <Textarea
              id="allergy-note"
              value={allergyNote}
              onChange={(event) => setAllergyNote(event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meal-photo">{t("composer.foodPhotos")}</Label>
            <label className="grid cursor-pointer place-items-center gap-2 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground transition hover:border-primary/50">
              <Upload className="h-6 w-6" />
              <span>{t("composer.choosePhotos")}</span>
              <Input
                id="meal-photo"
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple
                className="sr-only"
                onChange={(event) => uploadFiles(event.target.files)}
              />
            </label>
            {mediaAssetIds.length ? (
              <p className="text-sm text-muted-foreground">
                {t("composer.uploadedFiles", { count: mediaAssetIds.length })}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>{t("composer.eatingStatus")}</Label>
            <div className="grid max-h-80 gap-2 overflow-auto rounded-md border p-3">
              {visibleChildren.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("composer.chooseAudience")}
                </p>
              ) : (
                visibleChildren.map((child) => (
                  <div
                    key={child.id}
                    className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_180px]"
                  >
                    <div>
                      <p className="text-sm font-semibold">{child.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {child.className ?? t("detail.noClass")}
                      </p>
                    </div>
                    <Select
                      value={childStatuses[child.id] ?? "unset"}
                      onValueChange={(value) =>
                        setChildStatuses((current) => ({
                          ...current,
                          [child.id]:
                            value === "unset"
                              ? ""
                              : (value as MealEatingStatus),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unset">
                          {t("detail.notRecorded")}
                        </SelectItem>
                        {eatingStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(eatingStatusLabelKey(status))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
