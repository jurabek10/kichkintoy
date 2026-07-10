"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Clock, Search, Trash2 } from "lucide-react";
import type {
  CenterSearchResult,
  ChildGender,
  RelationshipType,
} from "@kichkintoy/shared";
import { FieldError, FieldHelper } from "@/components/field-error";
import { FormActions } from "@/components/form-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * The in-app "add a kid" wizard (Kidsnote-style): the same steps a parent
 * walked through at signup — kid info, relationship, kindergarten (any center,
 * so siblings can attend different ones), class, review — but submitted as a
 * join request while the parent stays signed in. The kid appears as "pending
 * approval" in the header switcher until the director approves.
 */

const STEPS = ["child", "relationship", "center", "class", "review"] as const;
type Step = (typeof STEPS)[number] | "done";

const GENDER_OPTIONS: Array<{ value: ChildGender; labelKey: string }> = [
  { value: "boy", labelKey: "signup.boy" },
  { value: "girl", labelKey: "signup.girl" },
  { value: "prefer_not_to_say", labelKey: "signup.preferNot" },
];

const RELATIONSHIP_OPTIONS: Array<{
  value: RelationshipType;
  labelKey: string;
}> = [
  { value: "mom", labelKey: "signup.relationshipOptions.mom" },
  { value: "dad", labelKey: "signup.relationshipOptions.dad" },
  { value: "grandmother", labelKey: "signup.relationshipOptions.grandmother" },
  { value: "grandfather", labelKey: "signup.relationshipOptions.grandfather" },
  { value: "uncle", labelKey: "signup.relationshipOptions.uncle" },
  { value: "aunt", labelKey: "signup.relationshipOptions.aunt" },
  { value: "brother", labelKey: "signup.relationshipOptions.brother" },
  { value: "sister", labelKey: "signup.relationshipOptions.sister" },
  { value: "guardian", labelKey: "signup.relationshipOptions.guardian" },
  { value: "other", labelKey: "signup.relationshipOptions.other" },
];

export function AddChildWizard() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("child");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Kid info
  const [childName, setChildName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<ChildGender | "">("");
  const [imageUrl, setImageUrl] = useState("");

  // Relationship
  const [relationshipType, setRelationshipType] = useState<
    RelationshipType | ""
  >("");
  const [customRelationshipLabel, setCustomRelationshipLabel] = useState("");

  // Kindergarten
  const [regionId, setRegionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CenterSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [centerId, setCenterId] = useState<string | null>(null);
  const [centerName, setCenterName] = useState<string | null>(null);

  // Class
  const [classId, setClassId] = useState<string | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [classUnknown, setClassUnknown] = useState(false);

  const stepIndex = step === "done" ? STEPS.length : STEPS.indexOf(step);

  function clearError(key: string) {
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function back() {
    if (stepIndex <= 0) {
      router.back();
      return;
    }
    setErrors({});
    setStep(STEPS[stepIndex - 1]!);
  }

  // --- Step: kid info ------------------------------------------------------

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setImageUrl("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({
        ...current,
        image: t("signup.errors.imageFile"),
      }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(String(reader.result ?? ""));
      clearError("image");
    };
    reader.readAsDataURL(file);
  }

  function submitChild() {
    const next: Record<string, string> = {};
    if (!childName.trim())
      next.childName = t("signup.errors.childNameRequired");
    if (!dateOfBirth) next.dateOfBirth = t("signup.errors.birthRequired");
    else if (new Date(dateOfBirth) > new Date())
      next.dateOfBirth = t("signup.errors.birthFuture");
    if (!gender) next.gender = t("signup.errors.genderRequired");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setStep("relationship");
  }

  // --- Step: relationship --------------------------------------------------

  function submitRelationship() {
    if (!relationshipType) {
      setErrors({
        relationshipType: t("signup.errors.relationshipRequired"),
      });
      return;
    }
    setErrors({});
    setStep("center");
  }

  // --- Step: kindergarten --------------------------------------------------

  const { data: regions = [] } = useQuery({
    queryKey: queryKeys.geo.regions(),
    queryFn: () => orpc.geo.regions({}),
  });
  const { data: districts = [] } = useQuery({
    queryKey: queryKeys.geo.districts(regionId),
    queryFn: () => orpc.geo.districts({ regionId }),
    enabled: !!regionId,
  });

  const searchMutation = useMutation({
    mutationFn: () =>
      orpc.centers.search({ regionId, districtId, q: query.trim() }),
    onSuccess: (rows) => setResults(rows),
    onError: (err) => {
      setResults([]);
      setErrors((current) => ({
        ...current,
        center: toApiError(err).message,
      }));
    },
  });

  function runSearch() {
    clearError("center");
    if (!regionId)
      return setErrors((c) => ({ ...c, center: t("signup.errors.regionRequired") }));
    if (!districtId)
      return setErrors((c) => ({ ...c, center: t("signup.errors.districtRequired") }));
    if (query.trim().length < 2)
      return setErrors((c) => ({ ...c, center: t("signup.errors.searchMinLength") }));
    setSearched(true);
    searchMutation.mutate();
  }

  function pickCenter(center: CenterSearchResult) {
    if (!center.selectable) return;
    setCenterId(center.id);
    setCenterName(center.name);
    setClassId(null);
    setClassName(null);
    setClassUnknown(false);
  }

  const codeMutation = useMutation({
    mutationFn: () => orpc.centers.byCode({ code: code.trim() }),
    onSuccess: (center) => {
      pickCenter(center);
      setResults([center]);
      setSearched(true);
      clearError("code");
    },
    onError: (err) =>
      setErrors((current) => ({ ...current, code: toApiError(err).message })),
  });

  function submitCenter() {
    if (!centerId) {
      setErrors((c) => ({ ...c, center: t("signup.errors.centerRequired") }));
      return;
    }
    setErrors({});
    setStep("class");
  }

  // --- Step: class ---------------------------------------------------------

  const { data: classes = [], isPending: classesLoading } = useQuery({
    queryKey: queryKeys.centers.classes(centerId ?? ""),
    queryFn: () => orpc.centers.classes({ centerId: centerId! }),
    enabled: !!centerId && step === "class",
  });

  // --- Step: review + submit -----------------------------------------------

  const submitMutation = useMutation({
    mutationFn: () =>
      orpc.centers.requestChildJoin({
        centerId: centerId!,
        classId: classId ?? undefined,
        child: {
          name: childName.trim(),
          dateOfBirth,
          gender: gender as ChildGender,
          relationshipType: relationshipType as RelationshipType,
          customRelationshipLabel:
            relationshipType === "other"
              ? customRelationshipLabel.trim() || undefined
              : undefined,
          imageUrl: imageUrl.startsWith("http") ? imageUrl : undefined,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile.joinRequests(),
      });
      setStep("done");
    },
    onError: (err) => setErrors({ form: toApiError(err).message }),
  });

  const relationshipLabel =
    relationshipType === "other"
      ? customRelationshipLabel.trim() ||
        t("signup.relationshipOptions.other")
      : relationshipType
        ? t(`signup.relationshipOptions.${relationshipType}`)
        : "—";

  if (step === "done") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-mint">
          <CheckCircle2 className="h-8 w-8 text-mint-ink" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("addChild.successTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("addChild.successBody", {
            child: childName.trim(),
            center: centerName ?? "",
          })}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sunshine px-3 py-1 text-xs font-bold text-sunshine-ink">
          <Clock className="h-3.5 w-3.5" />
          {t("childSwitcher.pending")}
        </span>
        <Button asChild size="lg" className="mt-2">
          <Link href="/dashboard">{t("addChild.backToHome")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {t("addChild.title")} · {stepIndex + 1}/{STEPS.length}
      </p>

      {step === "child" ? (
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("signup.steps.child")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("addChild.childDescription")}
            </p>
          </header>

          <div className="flex items-center gap-4">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-xl border border-dashed bg-muted text-muted-foreground">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Child"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Camera className="h-6 w-6" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="add-child-photo" className="inline-block">
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
                  id="add-child-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImage}
                />
              </label>
              {imageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start text-destructive hover:text-destructive"
                  onClick={() => setImageUrl("")}
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
            <Label htmlFor="add-child-name">{t("signup.childName")}</Label>
            <Input
              id="add-child-name"
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              placeholder="Aziza"
            />
            <FieldError message={errors.childName} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="add-child-dob">{t("signup.birthDate")}</Label>
            <DatePicker
              id="add-child-dob"
              value={dateOfBirth}
              onValueChange={setDateOfBirth}
            />
            <FieldError message={errors.dateOfBirth} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="add-child-gender">{t("signup.gender")}</Label>
            <Select
              value={gender || ""}
              onValueChange={(value) => setGender(value as ChildGender)}
            >
              <SelectTrigger id="add-child-gender">
                <SelectValue placeholder={t("signup.selectGender")} />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.gender} />
          </div>

          <FormActions
            back={
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={back}
              >
                {t("actions.back")}
              </Button>
            }
            next={
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={submitChild}
              >
                {t("actions.continue")}
              </Button>
            }
          />
        </div>
      ) : null}

      {step === "relationship" ? (
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("signup.relationshipTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("signup.relationshipDescription")}
            </p>
          </header>

          <div className="flex flex-wrap gap-2">
            {RELATIONSHIP_OPTIONS.map((option) => {
              const selected = relationshipType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRelationshipType(option.value);
                    setErrors({});
                  }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/40",
                  )}
                >
                  {t(option.labelKey)}
                </button>
              );
            })}
          </div>

          {relationshipType === "other" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-child-custom-rel">
                {t("signup.customRelationship")}
              </Label>
              <Input
                id="add-child-custom-rel"
                value={customRelationshipLabel}
                onChange={(event) =>
                  setCustomRelationshipLabel(event.target.value)
                }
                placeholder={t("signup.customRelationshipPlaceholder")}
              />
            </div>
          ) : null}

          <FieldError message={errors.relationshipType} />

          <FormActions
            back={
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={back}
              >
                {t("actions.back")}
              </Button>
            }
            next={
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={submitRelationship}
              >
                {t("actions.continue")}
              </Button>
            }
          />
        </div>
      ) : null}

      {step === "center" ? (
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("signup.centerTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("addChild.centerDescription")}
            </p>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-child-region">{t("signup.region")}</Label>
              <Select
                value={regionId}
                onValueChange={(value) => {
                  setRegionId(value);
                  setDistrictId("");
                }}
              >
                <SelectTrigger id="add-child-region">
                  <SelectValue placeholder={t("signup.selectRegion")} />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-child-district">{t("signup.district")}</Label>
              <Select
                value={districtId}
                onValueChange={setDistrictId}
                disabled={!regionId}
              >
                <SelectTrigger id="add-child-district">
                  <SelectValue
                    placeholder={
                      regionId
                        ? t("signup.selectDistrict")
                        : t("signup.pickRegionFirst")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="add-child-center-query">
              {t("signup.kindergartenName")}
            </Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                id="add-child-center-query"
                value={query}
                placeholder={t("signup.kindergartenNamePlaceholder")}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runSearch();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={runSearch}
                disabled={searchMutation.isPending}
              >
                <Search className="h-4 w-4" />
                {searchMutation.isPending
                  ? t("signup.searching")
                  : t("actions.search")}
              </Button>
            </div>
          </div>

          {errors.center ? (
            <Alert variant="destructive">
              <AlertDescription>{errors.center}</AlertDescription>
            </Alert>
          ) : null}

          {searched ? (
            <div className="flex flex-col gap-2">
              {results.length === 0 ? (
                <Alert variant="warning">
                  <AlertDescription>
                    {t("signup.noCentersFound")}
                  </AlertDescription>
                </Alert>
              ) : (
                results.map((center) => {
                  const selected = centerId === center.id;
                  return (
                    <button
                      key={center.id}
                      type="button"
                      onClick={() => pickCenter(center)}
                      disabled={!center.selectable}
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-xl border bg-card p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/40",
                        !center.selectable && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold">
                          {center.name}
                        </span>
                        <Badge variant="secondary">
                          {t(`signup.facilityTypes.${center.facilityType}`)}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {[center.district, center.address]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {center.centerCode}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}

          <div className="rounded-xl bg-muted p-4">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => setShowCode((v) => !v)}
            >
              {showCode ? t("signup.hide") : t("signup.directCenterCode")}
            </Button>
            {showCode ? (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="add-child-code">
                    {t("signup.centerCode")}
                  </Label>
                  <Input
                    id="add-child-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={t("signup.centerCodePlaceholder")}
                  />
                  <FieldError message={errors.code} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    clearError("code");
                    if (!code.trim()) {
                      setErrors((c) => ({
                        ...c,
                        code: t("signup.errors.centerCodeRequired"),
                      }));
                      return;
                    }
                    codeMutation.mutate();
                  }}
                >
                  {t("signup.lookupCenter")}
                </Button>
              </div>
            ) : null}
          </div>

          <FormActions
            back={
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={back}
              >
                {t("actions.back")}
              </Button>
            }
            next={
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={submitCenter}
              >
                {t("actions.continue")}
              </Button>
            }
          />
        </div>
      ) : null}

      {step === "class" ? (
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("signup.classTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("signup.classDescription", { center: centerName })}
            </p>
          </header>

          {classesLoading ? (
            <Alert variant="info">
              <AlertDescription>{t("signup.loadingClasses")}</AlertDescription>
            </Alert>
          ) : classes.length === 0 ? (
            <Alert variant="warning">
              <AlertDescription>{t("signup.noClassesYet")}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col gap-2">
              {classes.map((klass) => {
                const selected = classId === klass.id && !classUnknown;
                return (
                  <button
                    key={klass.id}
                    type="button"
                    onClick={() => {
                      setClassId(klass.id);
                      setClassName(klass.name);
                      setClassUnknown(false);
                    }}
                    className={cn(
                      "flex w-full flex-col rounded-xl border bg-card p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="text-base font-bold">{klass.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {[klass.ageGroup, klass.academicYear]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setClassId(null);
              setClassName(null);
              setClassUnknown(true);
            }}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              classUnknown
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/40",
            )}
          >
            <span className="flex flex-col">
              <span className="text-sm font-bold">
                {t("signup.dontKnowYet")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("signup.dontKnowDesc")}
              </span>
            </span>
          </button>

          <FormActions
            back={
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={back}
              >
                {t("actions.back")}
              </Button>
            }
            next={
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => setStep("review")}
              >
                {t("actions.continue")}
              </Button>
            }
          />
        </div>
      ) : null}

      {step === "review" ? (
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("signup.reviewTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("addChild.reviewDescription")}
            </p>
          </header>

          <dl className="grid gap-4 rounded-2xl border bg-muted/40 p-5 sm:grid-cols-2">
            <Detail label={t("signup.childName")} value={childName.trim()} />
            <Detail label={t("signup.birthDate")} value={dateOfBirth} />
            <Detail
              label={t("signup.steps.relationship")}
              value={relationshipLabel}
            />
            <Detail
              label={t("signup.steps.kindergarten")}
              value={centerName ?? "—"}
            />
            <Detail
              label={t("signup.steps.class")}
              value={className ?? t("signup.dontKnowYet")}
            />
            <Detail
              label={t("signup.status")}
              value={t("signup.pendingApproval")}
            />
          </dl>

          {errors.form ? (
            <Alert variant="destructive">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          ) : null}

          <FormActions
            back={
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={back}
              >
                {t("actions.back")}
              </Button>
            }
            next={
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => {
                  setErrors({});
                  submitMutation.mutate();
                }}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending
                  ? t("addChild.submitting")
                  : t("addChild.submit")}
              </Button>
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-bold">{value}</dd>
    </div>
  );
}
