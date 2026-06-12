"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent } from "react";
import { Camera, Trash2 } from "lucide-react";
import type { ChildGender } from "@kichkintoy/shared";
import { FieldError, FieldHelper } from "@/components/field-error";
import { FormActions } from "@/components/form-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { useSignup } from "../SignupContext";

const genderOptions: Array<{ value: ChildGender; labelKey: string }> = [
  { value: "boy", labelKey: "signup.boy" },
  { value: "girl", labelKey: "signup.girl" },
  { value: "prefer_not_to_say", labelKey: "signup.preferNot" },
];

export function ChildStep() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const { draft, setDraft } = useSignup();
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (draft.role !== "parent") router.replace("/signup/role");
  }, [draft.role, router]);

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setDraft((current) => ({ ...current, childImageUrl: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, image: t("signup.errors.imageFile") }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((current) => ({
        ...current,
        childImageUrl: String(reader.result ?? ""),
      }));
      setErrors((current) => {
        const next = { ...current };
        delete next.image;
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  function submit() {
    const next: Record<string, string> = {};
    if (!draft.childName.trim()) next.childName = t("signup.errors.childNameRequired");
    if (!draft.childDateOfBirth)
      next.childDateOfBirth = t("signup.errors.birthRequired");
    else if (new Date(draft.childDateOfBirth) > new Date())
      next.childDateOfBirth = t("signup.errors.birthFuture");
    if (!draft.childGender) next.childGender = t("signup.errors.genderRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    router.push("/signup/relationship");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("signup.childTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("signup.childDescription", {
            center: draft.centerName ?? t("signup.yourKindergarten"),
          })}
        </p>
      </header>

      <div className="flex items-center gap-4">
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-xl border border-dashed bg-muted text-muted-foreground">
          {draft.childImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.childImageUrl}
              alt="Child"
              className="h-full w-full object-cover"
            />
          ) : (
            <Camera className="h-6 w-6" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="child-photo" className="inline-block">
            <Button
              type="button"
              variant="outline"
              asChild
              className="cursor-pointer"
            >
              <span>
                <Camera className="h-4 w-4" />
                {t("signup.uploadPhoto")}
              </span>
            </Button>
            <input
              id="child-photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImage}
            />
          </label>
          {draft.childImageUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-destructive hover:text-destructive"
              onClick={() =>
                setDraft((current) => ({ ...current, childImageUrl: "" }))
              }
            >
              <Trash2 className="h-3 w-3" />
              {t("signup.remove")}
            </Button>
          ) : null}
          {errors.image ? (
            <FieldError message={errors.image} />
          ) : (
            <FieldHelper>{t("signup.imageHelper")}</FieldHelper>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-child-name">{t("signup.childName")}</Label>
        <Input
          id="signup-child-name"
          value={draft.childName}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              childName: event.target.value,
            }))
          }
          placeholder="Aziza"
        />
        <FieldError message={errors.childName} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-child-dob">{t("signup.birthDate")}</Label>
        <DatePicker
          id="signup-child-dob"
          value={draft.childDateOfBirth}
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              childDateOfBirth: value,
            }))
          }
        />
        <FieldError message={errors.childDateOfBirth} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-child-gender">{t("signup.gender")}</Label>
        <Select
          value={draft.childGender || ""}
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              childGender: value as ChildGender,
            }))
          }
        >
          <SelectTrigger id="signup-child-gender">
            <SelectValue placeholder={t("signup.selectGender")} />
          </SelectTrigger>
          <SelectContent>
            {genderOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors.childGender} />
      </div>

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
          <Button type="button" size="lg" className="w-full" onClick={submit}>
            {t("actions.continue")}
          </Button>
        }
      />
    </div>
  );
}
