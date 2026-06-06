"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Send, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";
import type { MealEatingStatus } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toApiError } from "@/lib/api/errors";
import {
  eatingStatusLabel,
  formatDate,
  mealAudienceLabel,
  mealTypeLabel,
} from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { SignedMealImage } from "./signed-meal-image";

const eatingStatuses: MealEatingStatus[] = [
  "ate_all",
  "ate_most",
  "ate_some",
  "did_not_eat",
];

export function MealDetailScreen({ mealId }: { mealId: string }) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const staff = session?.user.role !== "parent";
  const [statuses, setStatuses] = useState<Record<string, MealEatingStatus | "">>(
    {},
  );

  const {
    data: meal,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.meals.detail(mealId),
    queryFn: () => orpc.meals.detail({ mealId }),
  });

  useEffect(() => {
    if (!meal) return;
    setStatuses(
      Object.fromEntries(
        meal.childStatuses.map((status) => [status.child.id, status.status]),
      ),
    );
  }, [meal]);

  const publishMutation = useMutation({
    mutationFn: () => orpc.meals.publish({ mealId }),
    onSuccess: async () => {
      toast.success("Meal published.");
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orpc.meals.delete({ mealId }),
    onSuccess: async () => {
      toast.success("Meal deleted.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.meals.all() });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      orpc.meals.setChildStatuses({
        mealId,
        body: {
          statuses: Object.entries(statuses)
            .filter(([, status]) => status)
            .map(([childId, status]) => ({
              childId,
              status: status as MealEatingStatus,
            })),
        },
      }),
    onSuccess: async () => {
      toast.success("Eating status saved.");
      await invalidate();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.meals.all() });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.meals.detail(mealId),
    });
  }

  if (isPending) {
    return <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>;
  }

  if (error || !meal) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error ? toApiError(error).message : "Meal not found."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href="/dashboard/meals">
            <ArrowLeft className="h-4 w-4" />
            Back to meals
          </Link>
        </Button>
        {staff ? (
          <div className="flex gap-2">
            {meal.status === "draft" ? (
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                <Send className="h-4 w-4" />
                Publish
              </Button>
            ) : null}
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge>{mealTypeLabel(meal.mealType)}</Badge>
            <Badge variant="outline">{formatDate(meal.mealDate)}</Badge>
            <Badge variant="outline">{meal.status}</Badge>
            <Badge variant="outline">
              {mealAudienceLabel(meal.audienceType)}
            </Badge>
          </div>
          <CardTitle className="text-xl">{meal.menuText}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {meal.media.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {meal.media.map((media) => (
                <div
                  key={media.id}
                  className="overflow-hidden rounded-md border bg-muted"
                >
                  <SignedMealImage
                    mediaAssetId={media.assetId}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-md border bg-muted p-8">
              <Utensils className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          {meal.allergyNote ? (
            <Alert variant="warning">
              <AlertDescription>{meal.allergyNote}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {meal.classes.map((klass) => (
              <Badge key={klass.id} variant="secondary">
                {klass.name}
              </Badge>
            ))}
            {meal.classes.length === 0 ? (
              <Badge variant="secondary">{meal.centerName}</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Eating status</CardTitle>
          {staff ? (
            <Button
              onClick={() => statusMutation.mutate()}
              disabled={statusMutation.isPending}
            >
              <Save className="h-4 w-4" />
              Save status
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-3">
          {meal.childStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No eating status recorded yet.
            </p>
          ) : (
            meal.childStatuses.map((status) => (
              <div
                key={status.child.id}
                className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_180px]"
              >
                <div>
                  <p className="text-sm font-semibold">{status.child.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {status.child.className ?? "No class"}
                  </p>
                </div>
                {staff ? (
                  <Select
                    value={statuses[status.child.id] ?? "unset"}
                    onValueChange={(value) =>
                      setStatuses((current) => ({
                        ...current,
                        [status.child.id]:
                          value === "unset" ? "" : (value as MealEatingStatus),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not recorded</SelectItem>
                      {eatingStatuses.map((item) => (
                        <SelectItem key={item} value={item}>
                          {eatingStatusLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="w-fit">
                    {eatingStatusLabel(status.status)}
                  </Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
