"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type {
  CenterSearchResult,
  FacilityType,
} from "@kichkintoy/shared";
import { queryKeys } from "@/lib/query-keys";
import { FormActions } from "@/components/form-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { orpc } from "@/lib/orpc";
import { persistSession, routeForMembership } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useSignup } from "../SignupContext";

const facilityOptions: FacilityType[] = ["kindergarten", "daycare", "academy"];

export function DirectorSetupStep() {
  const { t } = useLayoutTranslation("app");
  const router = useRouter();
  const { draft, setDraft, reset } = useSignup();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CenterSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.phoneVerificationToken) router.replace("/signup");
    if (draft.role !== "director") router.replace("/signup/role");
  }, [draft.phoneVerificationToken, draft.role, router]);

  const { data: regions = [] } = useQuery({
    queryKey: queryKeys.geo.regions(),
    queryFn: () => orpc.geo.regions({}),
  });

  const { data: districts = [] } = useQuery({
    queryKey: queryKeys.geo.districts(draft.director.regionId),
    queryFn: () =>
      orpc.geo.districts({
        regionId: draft.director.regionId,
      }),
    enabled: !!draft.director.regionId,
  });

  function updateDirector<K extends keyof typeof draft.director>(
    key: K,
    value: (typeof draft.director)[K],
  ) {
    setDraft((current) => ({
      ...current,
      director: { ...current.director, [key]: value },
    }));
  }

  const searchMutation = useMutation({
    mutationFn: () =>
      orpc.centers.search({
        regionId: draft.director.regionId,
        districtId: draft.director.districtId,
        q: query.trim(),
        facilityType: draft.director.facilityType,
      }),
    onSuccess: (rows) => setResults(rows),
    onError: (err) => {
      setResults([]);
      setError(
        err instanceof Error ? err.message : t("signup.errors.searchFailed"),
      );
    },
  });

  const searching = searchMutation.isPending;

  function runSearch() {
    setError(null);
    if (!draft.director.regionId || !draft.director.districtId)
      return setError(t("signup.errors.regionDistrictRequired"));
    if (query.trim().length < 2)
      return setError(t("signup.errors.searchMinChars"));
    setSearched(true);
    searchMutation.mutate();
  }

  function chooseClaim(center: CenterSearchResult) {
    if (!center.selectable) return;
    updateDirector("mode", "claim_existing");
    updateDirector("claimCenterId", center.id);
    updateDirector("claimCenterName", center.name);
  }

  function switchToCreate() {
    updateDirector("mode", "create_new");
    updateDirector("claimCenterId", null);
    updateDirector("claimCenterName", null);
    if (!draft.director.centerName)
      updateDirector("centerName", query.trim());
  }

  const registerMutation = useMutation({
    mutationFn: () => {
      const body = {
        fullName: draft.fullName,
        phoneNumber: draft.phoneNumber,
        phoneVerificationToken: draft.phoneVerificationToken,
        username: draft.username,
        password: draft.password,
        role: "director" as const,
        directorSetup:
          draft.director.mode === "claim_existing"
            ? {
                mode: "claim_existing" as const,
                claimExisting: { centerId: draft.director.claimCenterId! },
              }
            : {
                mode: "create_new" as const,
                createNew: {
                  facilityType: draft.director.facilityType,
                  organizationName: draft.director.organizationName.trim(),
                  centerName: draft.director.centerName.trim(),
                  regionId: draft.director.regionId,
                  districtId: draft.director.districtId,
                  address: draft.director.address.trim() || undefined,
                  centerPhone: draft.director.centerPhone.trim() || undefined,
                  defaultLanguage: draft.director.defaultLanguage,
                },
              },
      };

      return orpc.auth.register(body);
    },
    onSuccess: (response) => {
      persistSession(response);
      reset();
      router.replace(
        routeForMembership(response.user.role, response.membership),
      );
    },
    onError: (err) =>
      setError(
        err instanceof Error ? err.message : t("signup.errors.registerFailed"),
      ),
  });

  const submitting = registerMutation.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!draft.director.mode)
      return setError(t("signup.errors.pickOrCreate"));

    if (draft.director.mode === "create_new") {
      if (draft.director.organizationName.trim().length < 2)
        return setError(t("signup.errors.orgNameRequired"));
      if (draft.director.centerName.trim().length < 2)
        return setError(t("signup.errors.kindergartenNameRequired"));
    }

    registerMutation.mutate();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("signup.directorSetupTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("signup.directorSetupDescription")}
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Label htmlFor="director-facility">{t("signup.facilityType")}</Label>
        <Select
          value={draft.director.facilityType}
          onValueChange={(value) =>
            updateDirector("facilityType", value as FacilityType)
          }
        >
          <SelectTrigger id="director-facility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {facilityOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`signup.facilityTypes.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="director-region">{t("signup.region")}</Label>
          <Select
            value={draft.director.regionId}
            onValueChange={(value) => {
              updateDirector("regionId", value);
              updateDirector("districtId", "");
            }}
          >
            <SelectTrigger id="director-region">
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
          <Label htmlFor="director-district">{t("signup.district")}</Label>
          <Select
            value={draft.director.districtId}
            onValueChange={(value) => updateDirector("districtId", value)}
            disabled={!draft.director.regionId}
          >
            <SelectTrigger id="director-district">
              <SelectValue
                placeholder={
                  draft.director.regionId
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
        <Label htmlFor="director-search">{t("signup.kindergartenName")}</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            id="director-search"
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
            disabled={searching}
          >
            <Search className="h-4 w-4" />
            {searching ? t("signup.searching") : t("actions.search")}
          </Button>
        </div>
      </div>

      {searched ? (
        <div className="flex flex-col gap-2">
          {results.length === 0 ? (
            <Alert variant="info">
              <AlertDescription>{t("signup.noCentersMatch")}</AlertDescription>
            </Alert>
          ) : (
            results.map((center) => {
              const selected =
                draft.director.mode === "claim_existing" &&
                draft.director.claimCenterId === center.id;
              return (
                <button
                  key={center.id}
                  type="button"
                  onClick={() => chooseClaim(center)}
                  disabled={!center.selectable}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-xl border bg-card p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40",
                    !center.selectable && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="text-base font-bold">{center.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {[center.district, center.address].filter(Boolean).join(" · ") ||
                      "—"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {center.centerCode}
                  </span>
                </button>
              );
            })
          )}
          <Button
            type="button"
            variant="link"
            className="h-auto self-start p-0 text-sm"
            onClick={switchToCreate}
          >
            {t("signup.cantFindCreate")}
          </Button>
        </div>
      ) : null}

      {draft.director.mode === "claim_existing" ? (
        <Alert variant="info">
          <AlertDescription>
            {t("signup.claimExistingInfo", {
              center: draft.director.claimCenterName,
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      {draft.director.mode === "create_new" ? (
        <div className="flex flex-col gap-4 rounded-2xl border bg-muted/40 p-5">
          <h2 className="text-base font-bold">
            {t("signup.createNewKindergarten")}
          </h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="director-org-name">
              {t("signup.organizationName")}
            </Label>
            <Input
              id="director-org-name"
              placeholder={t("signup.organizationNamePlaceholder")}
              value={draft.director.organizationName}
              onChange={(event) =>
                updateDirector("organizationName", event.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="director-center-name">
              {t("signup.kindergartenNameField")}
            </Label>
            <Input
              id="director-center-name"
              placeholder={t("signup.kindergartenNamePublicPlaceholder")}
              value={draft.director.centerName}
              onChange={(event) =>
                updateDirector("centerName", event.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="director-address">
              {t("signup.addressOptional")}
            </Label>
            <Input
              id="director-address"
              value={draft.director.address}
              onChange={(event) =>
                updateDirector("address", event.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="director-phone">
              {t("signup.centerPhoneOptional")}
            </Label>
            <Input
              id="director-phone"
              type="tel"
              value={draft.director.centerPhone}
              onChange={(event) =>
                updateDirector("centerPhone", event.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="director-language">
              {t("signup.defaultLanguage")}
            </Label>
            <Select
              value={draft.director.defaultLanguage}
              onValueChange={(value) =>
                updateDirector("defaultLanguage", value as "uz" | "ru")
              }
            >
              <SelectTrigger id="director-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uz">{t("signup.uzbek")}</SelectItem>
                <SelectItem value="ru">{t("signup.russian")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

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
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t("signup.creating") : t("signup.createAccount")}
          </Button>
        }
      />
    </form>
  );
}
