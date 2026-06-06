"use client";

import Link from "next/link";
import { Camera, Pill } from "lucide-react";
import type { MedicationRequestSummary } from "@kichkintoy/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatDate,
  medicationStatusLabel,
} from "@/lib/format";
import { SignedMedicationImage } from "./signed-medication-image";

export function MedicationCard({
  request,
}: {
  request: MedicationRequestSummary;
}) {
  return (
    <Link href={`/dashboard/medications/${request.id}`} className="block">
      <Card className="overflow-hidden transition hover:border-primary/40 hover:shadow-pop">
        {request.photo ? (
          <div className="aspect-[16/9] bg-muted">
            <SignedMedicationImage
              mediaAssetId={request.photo.assetId}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="grid aspect-[16/9] place-items-center bg-muted">
            <Pill className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <CardContent className="grid gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{medicationStatusLabel(request.status)}</Badge>
            <Badge variant="outline">
              {formatDate(request.requestedForDate)}
            </Badge>
            <Badge variant="outline">{request.medicationTime}</Badge>
          </div>
          <div>
            <p className="line-clamp-1 text-sm font-semibold">
              {request.child.name}
            </p>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {request.medicineName} · {request.dosage}
            </p>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            Symptoms: {request.symptoms}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{request.child.className ?? request.centerName}</span>
            <span className="inline-flex items-center gap-1">
              <Camera className="h-3.5 w-3.5" />
              {request.photo ? 1 : 0}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
