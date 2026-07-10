"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import type { PickupRelationship } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { orpc } from "@/lib/orpc";
import { useSelectedChild } from "@/lib/selected-child";
import { queryKeys } from "@/lib/query-keys";
import { pickupRelationshipLabelKey } from "./pickup-labels";

const relationships: PickupRelationship[] = [
  "mother",
  "father",
  "grandparent",
  "other",
];

export function PickupComposer() {
  const { t } = useLayoutTranslation("pickups");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [childId, setChildId] = useState("");
  const [pickupDate, setPickupDate] = useState(todayIso());
  const [pickupTime, setPickupTime] = useState("17:30");
  const [pickupPersonName, setPickupPersonName] = useState("");
  const [relationship, setRelationship] =
    useState<PickupRelationship>("mother");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: audience } = useQuery({
    queryKey: queryKeys.pickups.children(),
    queryFn: () => orpc.pickups.children({}),
  });

  // Default to the globally selected kid (header switcher).
  const { childId: selectedChildId } = useSelectedChild();
  useEffect(() => {
    if (childId || !audience) return;
    const preferred =
      audience.children.find((c) => c.id === selectedChildId) ??
      audience.children[0];
    if (preferred) setChildId(preferred.id);
  }, [audience, childId, selectedChildId]);

  const createMutation = useMutation({
    mutationFn: () =>
      orpc.pickups.create({
        childId,
        pickupDate,
        pickupTime,
        pickupPersonName,
        relationship,
        note: note || undefined,
      }),
    onSuccess: async (notice) => {
      toast.success(t("toast.sent"));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pickups.all(),
      });
      router.push(`/dashboard/pickups/${notice.id}`);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!childId) return setError(t("validation.childRequired"));
    if (!pickupDate) return setError(t("validation.dateRequired"));
    if (!pickupTime) return setError(t("validation.timeRequired"));
    if (!pickupPersonName.trim()) {
      return setError(t("validation.personRequired"));
    }
    createMutation.mutate();
  }

  const selectedChild = audience?.children.find((item) => item.id === childId);

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/pickups">
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
              <Label>{t("composer.child")}</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("composer.chooseChild")} />
                </SelectTrigger>
                <SelectContent>
                  {(audience?.children ?? []).map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedChild ? (
                <p className="text-xs text-muted-foreground">
                  {selectedChild.className ?? t("detail.noClass")}
                </p>
              ) : null}
            </div>
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
            disabled={createMutation.isPending}
          >
            <Send className="h-4 w-4" />
            {t("composer.sendNotice")}
          </Button>
        </CardContent>
      </Card>
    </form>
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
