"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";
import type { PickupRelationship } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import {
  pickupRelationshipLabelKey,
  pickupStatusLabelKey,
} from "./pickup-labels";

const relationships: PickupRelationship[] = [
  "mother",
  "father",
  "grandparent",
  "other",
];

export function PickupDetailScreen({ noticeId }: { noticeId: string }) {
  const { t } = useLayoutTranslation("pickups");
  const { session } = useSession();
  const queryClient = useQueryClient();
  const staff = session?.user.role !== "parent";
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupPersonName, setPickupPersonName] = useState("");
  const [relationship, setRelationship] =
    useState<PickupRelationship>("mother");
  const [note, setNote] = useState("");

  const {
    data: notice,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.pickups.detail(noticeId),
    queryFn: () => orpc.pickups.detail({ noticeId }),
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (!notice) return;
    setPickupDate(notice.pickupDate);
    setPickupTime(notice.pickupTime);
    setPickupPersonName(notice.pickupPersonName);
    setRelationship(notice.relationship);
    setNote(notice.note ?? "");
  }, [notice]);

  const updateMutation = useMutation({
    mutationFn: () =>
      orpc.pickups.update({
        noticeId,
        body: {
          pickupDate,
          pickupTime,
          pickupPersonName,
          relationship,
          note: note || undefined,
        },
      }),
    onSuccess: async () => {
      toast.success(t("toast.updated"));
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => orpc.pickups.cancel({ noticeId }),
    onSuccess: async () => {
      toast.success(t("toast.cancelled"));
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => orpc.pickups.acknowledge({ noticeId }),
    onSuccess: async () => {
      toast.success(t("toast.acknowledged"));
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.pickups.all() });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.pickups.detail(noticeId),
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pickupPersonName.trim()) {
      toast.error(t("validation.personRequired"));
      return;
    }
    updateMutation.mutate();
  }

  if (isPending) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">{t("loading")}</Card>
    );
  }

  if (error || !notice) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : t("detail.notFound")}
        </AlertDescription>
      </Alert>
    );
  }

  const parentCanEdit = !staff && notice.status !== "cancelled";
  const staffCanAcknowledge =
    staff && ["submitted", "changed"].includes(notice.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/dashboard/pickups">
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
        {parentCanEdit ? (
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm(t("detail.cancelConfirm"))) {
                cancelMutation.mutate();
              }
            }}
            disabled={cancelMutation.isPending}
          >
            <Ban className="h-4 w-4" />
            {t("detail.cancelNotice")}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{t(pickupStatusLabelKey(notice.status))}</Badge>
            <Badge variant="outline">{formatDate(notice.pickupDate)}</Badge>
            <Badge variant="outline">{notice.pickupTime}</Badge>
          </div>
          <CardTitle className="text-xl">{notice.child.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoGrid
            items={[
              [
                t("detail.class"),
                notice.child.className ?? t("detail.noClass"),
              ],
              [t("detail.parent"), notice.parentName],
              [t("detail.person"), notice.pickupPersonName],
              [
                t("detail.relationship"),
                t(pickupRelationshipLabelKey(notice.relationship)),
              ],
              [t("detail.note"), notice.note ?? "—"],
              [
                t("detail.acknowledgedBy"),
                notice.acknowledgedBy?.fullName ?? t("detail.notAcknowledged"),
              ],
              [
                t("detail.acknowledgedAt"),
                formatDateTime(notice.acknowledgedAt),
              ],
              [t("detail.submitted"), formatDateTime(notice.createdAt)],
            ]}
          />
        </CardContent>
      </Card>

      {parentCanEdit ? (
        <form onSubmit={submit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("detail.editTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="pickup-date"
                  label={t("composer.date")}
                  type="date"
                  value={pickupDate}
                  onChange={setPickupDate}
                />
                <Field
                  id="pickup-time"
                  label={t("composer.time")}
                  type="time"
                  value={pickupTime}
                  onChange={setPickupTime}
                />
                <Field
                  id="pickup-person-name"
                  label={t("composer.personName")}
                  value={pickupPersonName}
                  onChange={setPickupPersonName}
                />
                <div className="grid gap-2">
                  <Label>{t("composer.relationship")}</Label>
                  <Select
                    value={relationship}
                    onValueChange={(value) =>
                      setRelationship(value as PickupRelationship)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {relationships.map((item) => (
                        <SelectItem key={item} value={item}>
                          {t(pickupRelationshipLabelKey(item))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pickup-note">{t("composer.note")}</Label>
                <Textarea
                  id="pickup-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  rows={4}
                />
              </div>
              <Button
                type="submit"
                className="w-fit"
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {t("detail.saveChanges")}
              </Button>
            </CardContent>
          </Card>
        </form>
      ) : null}

      {staffCanAcknowledge ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("detail.staffConfirmation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => acknowledgeMutation.mutate()}
              disabled={acknowledgeMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("detail.acknowledge")}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="grid gap-1 rounded-md border p-3">
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            {label}
          </dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {type === "date" ? (
        <DatePicker id={id} value={value} onValueChange={onChange} />
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
