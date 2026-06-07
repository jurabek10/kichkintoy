"use client";

import Link from "next/link";
import { Clock, UserCheck } from "lucide-react";
import type { PickupNoticeSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  pickupRelationshipLabel,
  pickupStatusLabel,
} from "@/lib/format";

export function PickupCard({ notice }: { notice: PickupNoticeSummary }) {
  return (
    <Link href={`/dashboard/pickups/${notice.id}`} className="block">
      <Card className="h-full transition hover:border-primary/50 hover:shadow-sm">
        <CardHeader className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{pickupStatusLabel(notice.status)}</Badge>
            <Badge variant="outline">{formatDate(notice.pickupDate)}</Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              {notice.pickupTime}
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-primary" />
            {notice.child.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <p className="text-muted-foreground">
            {notice.child.className ?? "No class"}
          </p>
          <p>
            <span className="font-medium">{notice.pickupPersonName}</span>{" "}
            <span className="text-muted-foreground">
              ({pickupRelationshipLabel(notice.relationship)})
            </span>
          </p>
          {notice.note ? (
            <p className="line-clamp-2 text-muted-foreground">{notice.note}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
