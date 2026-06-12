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
import { toApiError } from "@/lib/api/errors";
import {
  formatDate,
  formatDateTime,
  pickupRelationshipLabel,
  pickupStatusLabel,
} from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";

const relationships: PickupRelationship[] = [
  "mother",
  "father",
  "grandparent",
  "other",
];

export function PickupDetailScreen({ noticeId }: { noticeId: string }) {
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
      toast.success("Pickup notice updated.");
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => orpc.pickups.cancel({ noticeId }),
    onSuccess: async () => {
      toast.success("Pickup notice cancelled.");
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => orpc.pickups.acknowledge({ noticeId }),
    onSuccess: async () => {
      toast.success("Pickup notice acknowledged.");
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
      toast.error("Pickup person name is required.");
      return;
    }
    updateMutation.mutate();
  }

  if (isPending) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading...</Card>;
  }

  if (error || !notice) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : "Pickup notice not found."}
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
            Back to pickup
          </Link>
        </Button>
        {parentCanEdit ? (
          <Button
            variant="destructive"
            onClick={() => {
              if (window.confirm("Cancel this pickup notice?")) {
                cancelMutation.mutate();
              }
            }}
            disabled={cancelMutation.isPending}
          >
            <Ban className="h-4 w-4" />
            Cancel notice
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{pickupStatusLabel(notice.status)}</Badge>
            <Badge variant="outline">{formatDate(notice.pickupDate)}</Badge>
            <Badge variant="outline">{notice.pickupTime}</Badge>
          </div>
          <CardTitle className="text-xl">{notice.child.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoGrid
            items={[
              ["Class", notice.child.className ?? "No class"],
              ["Parent", notice.parentName],
              ["Pickup person", notice.pickupPersonName],
              ["Relationship", pickupRelationshipLabel(notice.relationship)],
              ["Note", notice.note ?? "-"],
              [
                "Acknowledged by",
                notice.acknowledgedBy?.fullName ?? "Not acknowledged",
              ],
              ["Acknowledged at", formatDateTime(notice.acknowledgedAt)],
              ["Submitted", formatDateTime(notice.createdAt)],
            ]}
          />
        </CardContent>
      </Card>

      {parentCanEdit ? (
        <form onSubmit={submit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change pickup notice</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="pickup-date"
                  label="Pickup date"
                  type="date"
                  value={pickupDate}
                  onChange={setPickupDate}
                />
                <Field
                  id="pickup-time"
                  label="Pickup time"
                  type="time"
                  value={pickupTime}
                  onChange={setPickupTime}
                />
                <Field
                  id="pickup-person-name"
                  label="Pickup person name"
                  value={pickupPersonName}
                  onChange={setPickupPersonName}
                />
                <div className="grid gap-2">
                  <Label>Relationship</Label>
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
                          {pickupRelationshipLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pickup-note">Note</Label>
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
                Save changes
              </Button>
            </CardContent>
          </Card>
        </form>
      ) : null}

      {staffCanAcknowledge ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff confirmation</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => acknowledgeMutation.mutate()}
              disabled={acknowledgeMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              Acknowledge
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
