"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { SignedSpecialMedia } from "./signed-special-media";
import { currentMonth, specialClassLabel } from "./special-class-utils";

export function ParentSpecialClasses() {
  const [childId, setChildId] = useState("");
  const month = currentMonth();

  const childrenQuery = useQuery({
    queryKey: queryKeys.attendance.children(),
    queryFn: () => orpc.attendance.children({}),
  });

  const selectedChildId = childId || childrenQuery.data?.children[0]?.id || "";
  const feedInput = selectedChildId ? { childId: selectedChildId } : {};

  const feedQuery = useQuery({
    queryKey: queryKeys.specialClasses.parentFeed(feedInput),
    queryFn: () => orpc.specialClasses.parentFeed(feedInput),
  });

  const progressQuery = useQuery({
    queryKey: queryKeys.specialClasses.monthlyProgress({
      childId: selectedChildId,
      month,
    }),
    queryFn: () =>
      orpc.specialClasses.monthlyProgress({ childId: selectedChildId, month }),
    enabled: !!selectedChildId,
  });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Special classes</CardTitle>
            <CardDescription>
              See specialist lesson updates, interests, strengths, and practice
              suggestions.
            </CardDescription>
          </div>
          <Select value={selectedChildId} onValueChange={setChildId}>
            <SelectTrigger className="sm:w-60">
              <SelectValue placeholder="Choose child" />
            </SelectTrigger>
            <SelectContent>
              {(childrenQuery.data?.children ?? []).map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <ParentFeedCard items={feedQuery.data ?? []} />
        <MonthlyProgressCard month={month} rows={progressQuery.data ?? []} />
      </div>
    </div>
  );
}

function ParentFeedCard({
  items,
}: {
  items: NonNullable<
    Awaited<ReturnType<typeof orpc.specialClasses.parentFeed>>
  >;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No special class updates yet.
        </Card>
      ) : (
        items.map((item) => (
          <Card key={`${item.session.id}:${item.observation?.childId}`}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{item.session.subjectName}</Badge>
                <Badge variant="outline">{item.session.sessionDate}</Badge>
                <Badge variant="outline">{item.session.className}</Badge>
              </div>
              <CardTitle className="text-base">{item.session.title}</CardTitle>
              <CardDescription>{item.session.classSummary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.media.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {item.media.map((media) => (
                    <SignedSpecialMedia
                      key={media.id}
                      mediaAssetId={media.mediaAssetId}
                      mediaType={media.mediaType}
                    />
                  ))}
                </div>
              ) : null}
              {item.observation ? (
                <div className="grid gap-2 rounded-md border p-3 text-sm">
                  <p>
                    <span className="font-semibold">Progress:</span>{" "}
                    {specialClassLabel(item.observation.progressLevel)}
                  </p>
                  <p>
                    <span className="font-semibold">Interest:</span>{" "}
                    {specialClassLabel(item.observation.interestLevel)}
                  </p>
                  {item.observation.teacherNote ? (
                    <p>{item.observation.teacherNote}</p>
                  ) : null}
                  {item.observation.homePractice ? (
                    <p className="text-muted-foreground">
                      Home practice: {item.observation.homePractice}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function MonthlyProgressCard({
  month,
  rows,
}: {
  month: string;
  rows: NonNullable<
    Awaited<ReturnType<typeof orpc.specialClasses.monthlyProgress>>
  >;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          {month} progress
        </CardTitle>
        <CardDescription>Monthly subject chart for this child.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((subject) => (
          <div key={subject.subjectId} className="rounded-md border p-3">
            <p className="font-semibold">{subject.subjectName}</p>
            <p className="text-sm text-muted-foreground">
              {subject.attended}/{subject.sessions} attended ·{" "}
              {subject.highInterestCount} high-interest marks
            </p>
            <div className="mt-2 h-2 rounded bg-muted">
              <div
                className="h-2 rounded bg-primary"
                style={{
                  width: `${Math.min(
                    100,
                    subject.sessions
                      ? (subject.strongCount / subject.sessions) * 100
                      : 0,
                  )}%`,
                }}
              />
            </div>
            {subject.needsPractice.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Practice: {subject.needsPractice.join(", ")}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
