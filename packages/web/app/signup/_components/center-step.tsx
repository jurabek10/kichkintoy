"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { CenterSearchResult } from "@kichkintoy/shared";
import { queryKeys } from "@/lib/query-keys";
import { FieldError } from "@/components/field-error";
import { FormActions } from "@/components/form-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { orpc } from "@/lib/orpc";
import { facilityTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSignup } from "../SignupContext";

export function CenterStep() {
  const router = useRouter();
  const { draft, setDraft } = useSignup();
  const [regionId, setRegionId] = useState<string>("");
  const [districtId, setDistrictId] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<CenterSearchResult[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!draft.phoneVerificationToken) router.replace("/signup");
    if (!draft.role || draft.role === "director") router.replace("/signup/role");
  }, [draft.phoneVerificationToken, draft.role, router]);

  // Static reference data — cached across signup steps and the director flow.
  const { data: regions = [] } = useQuery({
    queryKey: queryKeys.geo.regions(),
    queryFn: () => orpc.geo.regions({}),
  });

  const { data: districts = [] } = useQuery({
    queryKey: queryKeys.geo.districts(regionId),
    queryFn: () =>
      orpc.geo.districts({ regionId }),
    enabled: !!regionId,
  });

  function onRegionChange(value: string) {
    setRegionId(value);
    setDistrictId("");
  }

  const searchMutation = useMutation({
    mutationFn: () =>
      orpc.centers.search({
        regionId,
        districtId,
        q: query.trim(),
      }),
    onSuccess: (rows) => setResults(rows),
    onError: (err) => {
      setResults([]);
      setError(err instanceof Error ? err.message : "Could not load centers.");
    },
  });

  const searching = searchMutation.isPending;

  function runSearch() {
    setError(null);
    if (!regionId) return setError("Choose a region first.");
    if (!districtId) return setError("Choose a district first.");
    if (query.trim().length < 2)
      return setError("Enter at least 2 characters of the kindergarten name.");

    setSearched(true);
    searchMutation.mutate();
  }

  function pick(center: CenterSearchResult) {
    if (!center.selectable) return;
    setDraft((current) => ({
      ...current,
      centerId: center.id,
      centerName: center.name,
      centerCode: center.centerCode,
      classId: null,
      className: null,
    }));
  }

  const codeMutation = useMutation({
    mutationFn: () =>
      orpc.centers.byCode({ code: code.trim() }),
    onSuccess: (center) => {
      setDraft((current) => ({
        ...current,
        centerId: center.id,
        centerName: center.name,
        centerCode: center.centerCode,
        classId: null,
        className: null,
      }));
      setResults([center]);
      setSearched(true);
    },
    onError: (err) =>
      setCodeError(
        err instanceof Error ? err.message : "Center code not found.",
      ),
  });

  function lookupByCode() {
    setCodeError(null);
    if (!code.trim()) return setCodeError("Enter the center code.");
    codeMutation.mutate();
  }

  function next() {
    if (!draft.centerId)
      return setError("Select your kindergarten to continue.");
    router.push(draft.role === "parent" ? "/signup/class" : "/signup/review");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Find your kindergarten
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick your region and district, then search by name.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-region">Region</Label>
          <Select value={regionId} onValueChange={onRegionChange}>
            <SelectTrigger id="signup-region">
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
          <Label htmlFor="signup-district">District</Label>
          <Select
            value={districtId}
            onValueChange={setDistrictId}
            disabled={!regionId}
          >
            <SelectTrigger id="signup-district">
              <SelectValue
                placeholder={regionId ? "Select district" : "Pick a region first"}
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
        <Label htmlFor="signup-center-query">Kindergarten name</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            id="signup-center-query"
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

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {searched ? (
        <div className="flex flex-col gap-2">
          {results.length === 0 ? (
            <Alert variant="warning">
              <AlertDescription>
                No kindergartens found in this district. Ask your director to
                send you an invitation.
              </AlertDescription>
            </Alert>
          ) : (
            results.map((center) => {
              const selected = draft.centerId === center.id;
              return (
                <button
                  key={center.id}
                  type="button"
                  onClick={() => pick(center)}
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
                    <span className="text-base font-bold">{center.name}</span>
                    <Badge variant="secondary">
                      {facilityTypeLabel(center.facilityType)}
                    </Badge>
                  </div>
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
        </div>
      ) : null}

      <div className="rounded-xl bg-muted p-4">
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={() => setShowCode((v) => !v)}
        >
          {showCode ? "Hide" : "I have a direct center code instead"}
        </Button>
        {showCode ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="signup-code-input">Center code</Label>
              <Input
                id="signup-code-input"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="e.g. KIC-7HQ4"
              />
              <FieldError message={codeError ?? undefined} />
            </div>
            <Button type="button" variant="outline" onClick={lookupByCode}>
              Look up center
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
            onClick={() => router.back()}
          >
            Back
          </Button>
        }
        next={
          <Button type="button" size="lg" className="w-full" onClick={next}>
            Continue
          </Button>
        }
      />
    </div>
  );
}
