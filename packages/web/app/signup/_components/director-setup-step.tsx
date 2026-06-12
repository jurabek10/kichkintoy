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
import { facilityTypeLabel } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { persistSession, routeForMembership } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useSignup } from "../SignupContext";

const facilityOptions: FacilityType[] = ["kindergarten", "daycare", "academy"];

export function DirectorSetupStep() {
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
      setError(err instanceof Error ? err.message : "Search failed.");
    },
  });

  const searching = searchMutation.isPending;

  function runSearch() {
    setError(null);
    if (!draft.director.regionId || !draft.director.districtId)
      return setError("Choose a region and district first.");
    if (query.trim().length < 2)
      return setError("Enter at least 2 characters.");
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
      setError(err instanceof Error ? err.message : "Could not register."),
  });

  const submitting = registerMutation.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!draft.director.mode)
      return setError("Pick an existing kindergarten or create a new one.");

    if (draft.director.mode === "create_new") {
      if (draft.director.organizationName.trim().length < 2)
        return setError("Organization name is required.");
      if (draft.director.centerName.trim().length < 2)
        return setError("Kindergarten name is required.");
    }

    registerMutation.mutate();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Set up your kindergarten
        </h1>
        <p className="text-sm text-muted-foreground">
          Search for your kindergarten. If it doesn't exist yet, create it.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Label htmlFor="director-facility">Facility type</Label>
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
                {facilityTypeLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="director-region">Region</Label>
          <Select
            value={draft.director.regionId}
            onValueChange={(value) => {
              updateDirector("regionId", value);
              updateDirector("districtId", "");
            }}
          >
            <SelectTrigger id="director-region">
              <SelectValue placeholder="Select region" />
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
          <Label htmlFor="director-district">District</Label>
          <Select
            value={draft.director.districtId}
            onValueChange={(value) => updateDirector("districtId", value)}
            disabled={!draft.director.regionId}
          >
            <SelectTrigger id="director-district">
              <SelectValue
                placeholder={
                  draft.director.regionId
                    ? "Select district"
                    : "Pick a region first"
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
        <Label htmlFor="director-search">Kindergarten name</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            id="director-search"
            value={query}
            placeholder="e.g. Quyoshcha"
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
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>

      {searched ? (
        <div className="flex flex-col gap-2">
          {results.length === 0 ? (
            <Alert variant="info">
              <AlertDescription>
                No kindergartens match. You can create a new one below.
              </AlertDescription>
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
            Can't find your kindergarten? Create a new one
          </Button>
        </div>
      ) : null}

      {draft.director.mode === "claim_existing" ? (
        <Alert variant="info">
          <AlertDescription>
            You will request to join{" "}
            <strong>{draft.director.claimCenterName}</strong> as a director. An
            existing director must approve.
          </AlertDescription>
        </Alert>
      ) : null}

      {draft.director.mode === "create_new" ? (
        <div className="flex flex-col gap-4 rounded-2xl border bg-muted/40 p-5">
          <h2 className="text-base font-bold">Create a new kindergarten</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="director-org-name">Organization name</Label>
            <Input
              id="director-org-name"
              placeholder="Legal entity name"
              value={draft.director.organizationName}
              onChange={(event) =>
                updateDirector("organizationName", event.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="director-center-name">Kindergarten name</Label>
            <Input
              id="director-center-name"
              placeholder="What parents will search for"
              value={draft.director.centerName}
              onChange={(event) =>
                updateDirector("centerName", event.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="director-address">Address (optional)</Label>
            <Input
              id="director-address"
              value={draft.director.address}
              onChange={(event) =>
                updateDirector("address", event.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="director-phone">Center phone (optional)</Label>
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
            <Label htmlFor="director-language">Default language</Label>
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
                <SelectItem value="uz">Uzbek</SelectItem>
                <SelectItem value="ru">Russian</SelectItem>
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
            Back
          </Button>
        }
        next={
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        }
      />
    </form>
  );
}
