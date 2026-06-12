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
import { toApiError } from "@/lib/api/errors";
import { pickupRelationshipLabel } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

const relationships: PickupRelationship[] = [
  "mother",
  "father",
  "grandparent",
  "other",
];

export function PickupComposer() {
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

  useEffect(() => {
    if (!childId && audience?.children[0]) {
      setChildId(audience.children[0].id);
    }
  }, [audience, childId]);

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
      toast.success("Pickup notice sent.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.pickups.all() });
      router.push(`/dashboard/pickups/${notice.id}`);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!childId) return setError("Choose a child.");
    if (!pickupDate) return setError("Pickup date is required.");
    if (!pickupTime) return setError("Pickup time is required.");
    if (!pickupPersonName.trim()) {
      return setError("Pickup person name is required.");
    }
    createMutation.mutate();
  }

  const selectedChild = audience?.children.find((item) => item.id === childId);

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Button asChild variant="ghost" className="w-fit">
        <Link href="/dashboard/pickups">
          <ArrowLeft className="h-4 w-4" />
          Back to pickup
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">New pickup notice</CardTitle>
          <CardDescription>
            Tell the center who will pick up your child and when.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Child</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose child" />
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
                  {selectedChild.className ?? "No class"}
                </p>
              ) : null}
            </div>
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
            disabled={createMutation.isPending}
          >
            <Send className="h-4 w-4" />
            Send notice
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
