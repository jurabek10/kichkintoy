"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminCenterFields, FacilityType } from "@kichkintoy/shared";
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
import { queryKeys } from "@/lib/query-keys";

const facilityOptions: FacilityType[] = ["kindergarten", "daycare", "academy"];

export type CenterFormValues = {
  name: string;
  facilityType: FacilityType;
  regionId: string;
  districtId: string;
  address: string;
  phone: string;
  monthlyTuitionUzs: string;
};

export const emptyCenterForm: CenterFormValues = {
  name: "",
  facilityType: "kindergarten",
  regionId: "",
  districtId: "",
  address: "",
  phone: "",
  monthlyTuitionUzs: "1000000",
};

export function toAdminCenterFields(
  values: CenterFormValues,
): AdminCenterFields {
  return {
    name: values.name.trim(),
    facilityType: values.facilityType,
    regionId: values.regionId,
    districtId: values.districtId,
    address: values.address.trim() || undefined,
    phone: values.phone.trim() || undefined,
    monthlyTuitionUzs: Number(values.monthlyTuitionUzs),
  };
}

/**
 * Center fields shared by "Add center" and "Edit center". Region → district
 * are dependent selects, same as the director self-signup step.
 */
export function CenterForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  submittingLabel,
  submitting,
  error,
  idPrefix,
}: {
  values: CenterFormValues;
  onChange: (values: CenterFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  error: string | null;
  idPrefix: string;
}) {
  const { t } = useLayoutTranslation("admin");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: regions = [] } = useQuery({
    queryKey: queryKeys.geo.regions(),
    queryFn: () => orpc.geo.regions({}),
  });

  const { data: districts = [] } = useQuery({
    queryKey: queryKeys.geo.districts(values.regionId),
    queryFn: () => orpc.geo.districts({ regionId: values.regionId }),
    enabled: !!values.regionId,
  });

  function update<K extends keyof CenterFormValues>(
    key: K,
    value: CenterFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (values.name.trim().length < 2) {
      return setValidationError(t("form.validation.nameRequired"));
    }
    if (!values.regionId) {
      return setValidationError(t("form.validation.regionRequired"));
    }
    if (!values.districtId) {
      return setValidationError(t("form.validation.districtRequired"));
    }
    const tuition = Number(values.monthlyTuitionUzs);
    if (!Number.isFinite(tuition) || tuition < 0) {
      return setValidationError(t("form.validation.tuitionInvalid"));
    }

    onSubmit();
  }

  const formError = validationError ?? error;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>{t("form.name")}</Label>
        <Input
          id={`${idPrefix}-name`}
          value={values.name}
          placeholder={t("form.namePlaceholder")}
          onChange={(event) => update("name", event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-facility`}>{t("form.facilityType")}</Label>
          <Select
            value={values.facilityType}
            onValueChange={(value) =>
              update("facilityType", value as FacilityType)
            }
          >
            <SelectTrigger id={`${idPrefix}-facility`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {facilityOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`form.facility.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-phone`}>{t("form.phone")}</Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            value={values.phone}
            placeholder={t("form.phonePlaceholder")}
            onChange={(event) => update("phone", event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-region`}>{t("form.region")}</Label>
          <Select
            value={values.regionId}
            onValueChange={(value) =>
              onChange({ ...values, regionId: value, districtId: "" })
            }
          >
            <SelectTrigger id={`${idPrefix}-region`}>
              <SelectValue placeholder={t("form.pickRegion")} />
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
          <Label htmlFor={`${idPrefix}-district`}>{t("form.district")}</Label>
          <Select
            value={values.districtId}
            onValueChange={(value) => update("districtId", value)}
            disabled={!values.regionId}
          >
            <SelectTrigger id={`${idPrefix}-district`}>
              <SelectValue placeholder={t("form.pickDistrict")} />
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
        <Label htmlFor={`${idPrefix}-address`}>{t("form.address")}</Label>
        <Input
          id={`${idPrefix}-address`}
          value={values.address}
          placeholder={t("form.addressPlaceholder")}
          onChange={(event) => update("address", event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-tuition`}>{t("form.tuition")}</Label>
        <Input
          id={`${idPrefix}-tuition`}
          type="number"
          min={0}
          step={10000}
          inputMode="numeric"
          value={values.monthlyTuitionUzs}
          onChange={(event) => update("monthlyTuitionUzs", event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t("form.tuitionHint")}</p>
      </div>

      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("form.cancel")}
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
