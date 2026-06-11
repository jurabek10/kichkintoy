"use client";

import type {
  SpecialClassChildObservation,
  SpecialClassSessionSummary,
  SpecialInterestLevel,
  SpecialParticipation,
  SpecialProgressLevel,
} from "@kichkintoy/shared";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { FileText, ImagePlus, Search, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { SignedSpecialMedia } from "./signed-special-media";
import {
  defaultObservation,
  interestOptions,
  participationOptions,
  progressOptions,
  specialClassLabel,
  type ObservationDraft,
} from "./special-class-utils";

type ChildRow = {
  id: string;
  name: string;
  observation: SpecialClassChildObservation | null;
};

export function ObservationEditor({
  session,
  children,
  drafts,
  setDrafts,
  onSave,
  onSaveChild,
  saving,
  onUpload,
  onUploadForChild,
  uploading,
  onPublish,
  publishing,
}: {
  session: (SpecialClassSessionSummary & {
    observations: SpecialClassChildObservation[];
    media: Array<{
      id: string;
      mediaAssetId: string;
      mediaType: string;
      childIds?: string[];
    }>;
  }) | null;
  children: Array<{ id: string; name: string }>;
  drafts: Record<string, ObservationDraft>;
  setDrafts: (value: Record<string, ObservationDraft>) => void;
  onSave: () => void;
  onSaveChild: (childId: string) => void;
  saving: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadForChild: (childId: string, files: FileList) => void;
  uploading: boolean;
  onPublish: (session: SpecialClassSessionSummary) => void;
  publishing: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");

  const rows = useMemo(
    () =>
      children.map((child) => ({
        ...child,
        observation:
          session?.observations.find((item) => item.childId === child.id) ?? null,
      })),
    [children, session?.observations],
  );
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((child) => child.name.toLowerCase().includes(query));
  }, [rows, search]);
  const selectedChild =
    rows.find((child) => child.id === selectedChildId) ?? filteredRows[0] ?? rows[0];

  const columns = useMemo<ColumnDef<ChildRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Child",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-semibold hover:text-primary"
            onClick={() => setSelectedChildId(row.original.id)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        id: "progress",
        header: "Progress",
        cell: ({ row }) => {
          const draft = draftFor(row.original.id);
          return <Badge variant="outline">{specialClassLabel(draft.progressLevel)}</Badge>;
        },
      },
      {
        id: "interest",
        header: "Interest",
        cell: ({ row }) => {
          const draft = draftFor(row.original.id);
          return <span>{specialClassLabel(draft.interestLevel)}</span>;
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.observation ? (
            <Badge variant="success">saved</Badge>
          ) : (
            <Badge variant="secondary">draft</Badge>
          ),
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant={row.original.id === selectedChild?.id ? "default" : "outline"}
            onClick={() => setSelectedChildId(row.original.id)}
          >
            Write report
          </Button>
        ),
      },
    ],
    [drafts, selectedChild?.id, session?.observations],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function draftFor(childId: string) {
    const existing = session?.observations.find((item) => item.childId === childId);
    return (
      drafts[childId] ??
      (existing
        ? {
            participation: existing.participation,
            progressLevel: existing.progressLevel,
            interestLevel: existing.interestLevel,
            strongSkillKeys: existing.strongSkillKeys.join(", "),
            needsPracticeSkillKeys: existing.needsPracticeSkillKeys.join(", "),
            teacherNote: existing.teacherNote ?? "",
            homePractice: existing.homePractice ?? "",
            visibleToParent: existing.visibleToParent,
          }
        : defaultObservation())
    );
  }

  function updateDraft(childId: string, patch: Partial<ObservationDraft>) {
    setDrafts({ ...drafts, [childId]: { ...draftFor(childId), ...patch } });
  }

  if (!session) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Choose today&apos;s fixed class and create a lesson record first.
      </Card>
    );
  }

  const selectedDraft = selectedChild ? draftFor(selectedChild.id) : null;
  const childMedia = selectedChild
    ? session.media.filter((media) => media.childIds?.includes(selectedChild.id))
    : [];
  const classMedia = session.media.filter((media) => !media.childIds?.length);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <CardTitle className="text-base">{session.title}</CardTitle>
          <CardDescription>
            {session.sessionDate} · {session.className} · {session.subjectName}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild disabled={uploading}>
            <Label className="cursor-pointer">
              <ImagePlus className="h-4 w-4" />
              Class media
              <Input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={onUpload}
              />
            </Label>
          </Button>
          <Button onClick={onSave} disabled={children.length === 0 || saving}>
            <FileText className="h-4 w-4" />
            Save all
          </Button>
          <Button
            variant={session.status === "published" ? "outline" : "default"}
            disabled={publishing || session.status === "published"}
            onClick={() => onPublish(session)}
          >
            <Send className="h-4 w-4" />
            Publish all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {classMedia.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {classMedia.map((media) => (
              <SignedSpecialMedia
                key={media.id}
                mediaAssetId={media.mediaAssetId}
                mediaType={media.mediaType}
              />
            ))}
          </div>
        ) : null}

        <Card className="border-muted">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle className="text-base">Children</CardTitle>
              <CardDescription>
                Search by name, then click Write report for the child you want.
              </CardDescription>
            </div>
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search child by name"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-muted text-left">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-3 py-2 font-semibold">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.original.id === selectedChild?.id
                          ? "border-t bg-accent"
                          : "border-t"
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <ChildReportPanel
          child={selectedChild}
          draft={selectedDraft}
          childMedia={childMedia}
          saving={saving}
          uploading={uploading}
          onUpdate={updateDraft}
          onSave={onSaveChild}
          onUpload={onUploadForChild}
        />
      </CardContent>
    </Card>
  );
}

function ChildReportPanel({
  child,
  draft,
  childMedia,
  saving,
  uploading,
  onUpdate,
  onSave,
  onUpload,
}: {
  child: ChildRow | undefined;
  draft: ObservationDraft | null;
  childMedia: Array<{ id: string; mediaAssetId: string; mediaType: string }>;
  saving: boolean;
  uploading: boolean;
  onUpdate: (childId: string, patch: Partial<ObservationDraft>) => void;
  onSave: (childId: string) => void;
  onUpload: (childId: string, files: FileList) => void;
}) {
  if (!child || !draft) {
    return (
      <Card className="border-muted p-6 text-sm text-muted-foreground">
        No child selected.
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="text-base">Report for {child.name}</CardTitle>
        <CardDescription>
          Write only what matters for this child, then save and upload media if
          needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <SmallSelect
                value={draft.participation}
                values={participationOptions}
                onChange={(value) =>
                  onUpdate(child.id, {
                    participation: value as SpecialParticipation,
                  })
                }
              />
              <SmallSelect
                value={draft.progressLevel}
                values={progressOptions}
                onChange={(value) =>
                  onUpdate(child.id, {
                    progressLevel: value as SpecialProgressLevel,
                  })
                }
              />
              <SmallSelect
                value={draft.interestLevel}
                values={interestOptions}
                onChange={(value) =>
                  onUpdate(child.id, {
                    interestLevel: value as SpecialInterestLevel,
                  })
                }
              />
              <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <Checkbox
                  checked={draft.visibleToParent}
                  onCheckedChange={(checked) =>
                    onUpdate(child.id, { visibleToParent: checked === true })
                  }
                />
                Parent can see
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Strengths: rhythm, colors, counting"
                value={draft.strongSkillKeys}
                onChange={(event) =>
                  onUpdate(child.id, { strongSkillKeys: event.target.value })
                }
              />
              <Input
                placeholder="Practice: confidence, pronunciation"
                value={draft.needsPracticeSkillKeys}
                onChange={(event) =>
                  onUpdate(child.id, {
                    needsPracticeSkillKeys: event.target.value,
                  })
                }
              />
            </div>

            <Input
              placeholder="Home practice suggestion"
              value={draft.homePractice}
              onChange={(event) =>
                onUpdate(child.id, { homePractice: event.target.value })
              }
            />
            <Textarea
              placeholder="Short teacher note for this child"
              value={draft.teacherNote}
              onChange={(event) =>
                onUpdate(child.id, { teacherNote: event.target.value })
              }
              className="min-h-28"
            />

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onSave(child.id)} disabled={saving}>
                <FileText className="h-4 w-4" />
                Save child report
              </Button>
              <Button variant="outline" asChild disabled={uploading}>
                <Label className="cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  Child media
                  <Input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files) onUpload(child.id, event.target.files);
                    }}
                  />
                </Label>
              </Button>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-3 text-sm font-semibold">Child media</p>
            {childMedia.length > 0 ? (
              <div className="grid gap-2">
                {childMedia.map((media) => (
                  <SignedSpecialMedia
                    key={media.id}
                    mediaAssetId={media.mediaAssetId}
                    mediaType={media.mediaType}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No child-specific media yet.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SmallSelect({
  value,
  values,
  onChange,
}: {
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((item) => (
          <SelectItem key={item} value={item}>
            {specialClassLabel(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
