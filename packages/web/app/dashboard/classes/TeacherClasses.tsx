"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { School, Users } from "lucide-react";
import type { TeacherClass } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { queryKeys } from "@/lib/query-keys";
import { assignmentRoleLabel } from "@/lib/format";
import { orpc } from "@/lib/orpc";

export function TeacherClasses() {
  const {
    data: classes = [],
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.teacher.classes(),
    queryFn: () => orpc.teacher.classes({}),
  });

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Could not load classes."
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">My classes</CardTitle>
          <CardDescription>
            The classes you are assigned to and the children in each.
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <School className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold">No classes assigned yet</p>
              <p className="text-sm text-muted-foreground">
                Your director will assign you to a class.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((klass) => (
            <Link
              key={klass.id}
              href={`/dashboard/classes/${klass.id}`}
              className="group block rounded-2xl border bg-card text-card-foreground shadow-card transition hover:border-primary/40 hover:shadow-pop"
            >
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <School className="h-5 w-5" />
                  </span>
                  <Badge variant="info">
                    {assignmentRoleLabel(klass.assignmentRole)}
                  </Badge>
                </div>
                <div>
                  <p className="text-base font-bold">{klass.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[klass.ageGroup, klass.academicYear]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {klass.childCount}{" "}
                  {klass.childCount === 1 ? "child" : "children"}
                </span>
              </CardContent>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
