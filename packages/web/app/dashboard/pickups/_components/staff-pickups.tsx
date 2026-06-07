"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import type { PickupNoticeStatus } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import { pickupStatusLabel } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { PickupCard } from "./pickup-card";

const statusOptions: PickupNoticeStatus[] = [
  "submitted",
  "changed",
  "acknowledged",
  "cancelled",
];

export function StaffPickups({ centerId }: { centerId: string | null }) {
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState("all");
  const input = {
    centerId: centerId ?? "",
    date,
    status: status === "all" ? undefined : (status as PickupNoticeStatus),
  };
  const {
    data: notices = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.pickups.staffList(input),
    queryFn: () => orpc.pickups.staffList(input),
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
            <CardTitle className="text-xl">Pickup</CardTitle>
            <CardDescription>
              Review today's pickup notices and acknowledge changes.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-[155px]"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[165px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {pickupStatusLabel(item)}
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
        <Card className="p-6 text-sm text-muted-foreground">Loading...</Card>
      ) : notices.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <UserCheck className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">No pickup notices for today</p>
          <p className="text-sm text-muted-foreground">
            Parent pickup notices will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {notices.map((notice) => (
            <PickupCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
