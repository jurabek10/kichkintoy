"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pill } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import { medicationStatusLabel } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { MedicationCard } from "./medication-card";
import type { MedicationStatus } from "@kichkintoy/shared";

const statusOptions: MedicationStatus[] = [
  "pending",
  "administered",
  "skipped",
  "cancelled",
];

export function StaffMedications({ centerId }: { centerId: string | null }) {
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState("pending");
  const input = {
    centerId: centerId ?? "",
    date,
    status: status === "all" ? undefined : (status as MedicationStatus),
  };
  const {
    data: requests = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.medications.staffList(input),
    queryFn: () => orpc.medications.staffList(input),
    enabled: !!centerId,
  });

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Your account is not linked to a center yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Medication</CardTitle>
            <CardDescription>
              Review parent requests and complete administration reports.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DatePicker
              value={date}
              onValueChange={setDate}
              className="w-[155px]"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {medicationStatusLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{toApiError(error).message}</AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : requests.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <Pill className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">No medication requests</p>
          <p className="text-sm text-muted-foreground">
            Requests from parents will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
            <MedicationCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
