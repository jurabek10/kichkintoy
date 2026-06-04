"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { NoticeCard } from "./notice-cards";

type NoticeStatusFilter = "all" | "draft" | "scheduled" | "published";

export function StaffNotices({
  centerId,
}: {
  centerId: string | null;
  director: boolean;
}) {
  const [status, setStatus] = useState<NoticeStatusFilter>("all");
  const {
    data: notices = [],
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.notices.authorList(centerId ?? "", status),
    queryFn: () =>
      orpc.notices.authorList({
        centerId: centerId!,
        status: status === "all" ? undefined : status,
      }),
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
            <CardTitle className="text-xl">Notices</CardTitle>
            <CardDescription>
              Send operational updates to parents and track who has read them.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as NoticeStatusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/dashboard/notices/new">
                <Plus className="h-4 w-4" />
                New notice
              </Link>
            </Button>
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
      ) : notices.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">No notices yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first center-home announcement.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      )}
    </div>
  );
}
