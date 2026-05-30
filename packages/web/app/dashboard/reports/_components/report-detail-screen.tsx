"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { DailyReportDetail } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiRequest } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  reportItemTypeLabel,
  reportStatusLabel,
} from "@/lib/format";

export function ReportDetailScreen({
  isParent,
  reportId,
}: {
  isParent: boolean;
  reportId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [edit, setEdit] = useState({ mood: "", teacherNote: "", healthNote: "" });
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const reportKey = ["report", reportId, { isParent }] as const;

  const {
    data: report = null,
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: reportKey,
    queryFn: () =>
      apiRequest<DailyReportDetail>(
        isParent
          ? `/parent/reports/${reportId}`
          : `/teacher/reports/${reportId}`,
        { auth: true },
      ),
  });

  // Keep the edit form in sync with the loaded report.
  useEffect(() => {
    if (report) {
      setEdit({
        mood: report.mood ?? "",
        teacherNote: report.teacherNote ?? "",
        healthNote: report.healthNote ?? "",
      });
    }
  }, [report]);

  const invalidateReport = () =>
    queryClient.invalidateQueries({ queryKey: reportKey });
  const onActionError = (message: string) => (err: unknown) =>
    setActionError(err instanceof ApiError ? err.message : message);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/teacher/reports/${reportId}`, {
        method: "PATCH",
        auth: true,
        body: edit,
      }),
    onSuccess: async () => {
      toast.success("Report updated.");
      await invalidateReport();
    },
    onError: onActionError("Could not update report."),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/teacher/reports/${reportId}/publish`, {
        method: "POST",
        auth: true,
        body: {},
      }),
    onSuccess: async () => {
      toast.success("Report published.");
      await invalidateReport();
    },
    onError: onActionError("Could not publish report."),
  });

  const unpublishMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/teacher/reports/${reportId}/unpublish`, {
        method: "POST",
        auth: true,
      }),
    onSuccess: async () => {
      toast("Report moved back to draft.");
      await invalidateReport();
    },
    onError: onActionError("Could not unpublish report."),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/teacher/reports/${reportId}`, {
        method: "DELETE",
        auth: true,
      }),
    onSuccess: () => {
      toast("Report deleted.");
      router.push("/dashboard/reports");
    },
    onError: onActionError("Could not delete report."),
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      apiRequest(
        isParent
          ? `/parent/reports/${reportId}/comments`
          : `/teacher/reports/${reportId}/comments`,
        { method: "POST", auth: true, body: { body: comment.trim() } },
      ),
    onSuccess: async () => {
      setComment("");
      await invalidateReport();
    },
    onError: onActionError("Could not add comment."),
  });

  const working =
    saveMutation.isPending ||
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    deleteMutation.isPending ||
    commentMutation.isPending;
  const error =
    actionError ??
    (loadError
      ? loadError instanceof ApiError
        ? loadError.message
        : "Could not load report."
      : null);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);
    saveMutation.mutate();
  }

  function publish() {
    setActionError(null);
    publishMutation.mutate();
  }

  function unpublish() {
    setActionError(null);
    unpublishMutation.mutate();
  }

  function removeReport() {
    setActionError(null);
    deleteMutation.mutate();
  }

  function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) return;
    setActionError(null);
    commentMutation.mutate();
  }

  if (loading) return <LoadingCard />;
  if (!report) return <MissingReport error={error} />;

  return (
    <div className="flex flex-col gap-4">
      <BackToReports />
      <ReportHeader
        isParent={isParent}
        report={report}
        working={working}
        onDelete={removeReport}
        onPublish={publish}
        onUnpublish={unpublish}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isParent ? (
        <ReportEditForm
          edit={edit}
          working={working}
          onChange={setEdit}
          onSubmit={save}
        />
      ) : null}

      <ReportBody report={report} />

      {!isParent ? <ReadReceipts report={report} /> : null}

      <Comments
        comment={comment}
        report={report}
        working={working}
        onCommentChange={setComment}
        onSubmit={addComment}
      />
    </div>
  );
}

function LoadingCard() {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">
        Loading…
      </CardContent>
    </Card>
  );
}

function MissingReport({ error }: { error: string | null }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{error ?? "Report not found."}</AlertDescription>
    </Alert>
  );
}

function BackToReports() {
  return (
    <Link
      href="/dashboard/reports"
      className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Reports
    </Link>
  );
}

function ReportHeader({
  isParent,
  onDelete,
  onPublish,
  onUnpublish,
  report,
  working,
}: {
  isParent: boolean;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  report: DailyReportDetail;
  working: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">
              {report.child.name} · {formatDate(report.reportDate)}
            </CardTitle>
            <ReportStatusBadge status={report.status} />
          </div>
          <CardDescription>
            {report.class.name} · Author {report.author.fullName}
            {report.publishedAt
              ? ` · Published ${formatDateTime(report.publishedAt)}`
              : ""}
          </CardDescription>
        </div>
        {!isParent ? (
          <div className="flex flex-wrap gap-2">
            {report.status !== "published" ? (
              <Button type="button" onClick={onPublish} disabled={working}>
                Publish
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onUnpublish}
                disabled={working}
              >
                Unpublish
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={working}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        ) : null}
      </CardHeader>
    </Card>
  );
}

function ReportStatusBadge({ status }: { status: DailyReportDetail["status"] }) {
  return (
    <Badge
      variant={
        status === "published"
          ? "success"
          : status === "scheduled"
            ? "warning"
            : "secondary"
      }
    >
      {reportStatusLabel(status)}
    </Badge>
  );
}

function ReportEditForm({
  edit,
  onChange,
  onSubmit,
  working,
}: {
  edit: { mood: string; teacherNote: string; healthNote: string };
  onChange: (value: { mood: string; teacherNote: string; healthNote: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  working: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mood">Mood</Label>
            <Input
              id="mood"
              value={edit.mood}
              onChange={(event) => onChange({ ...edit, mood: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="teacher-note">Teacher note</Label>
            <Textarea
              id="teacher-note"
              value={edit.teacherNote}
              onChange={(event) =>
                onChange({ ...edit, teacherNote: event.target.value })
              }
              rows={5}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="health-note">Health note</Label>
            <Textarea
              id="health-note"
              value={edit.healthNote}
              onChange={(event) =>
                onChange({ ...edit, healthNote: event.target.value })
              }
            />
          </div>
          <Button type="submit" disabled={working} className="w-fit">
            Save changes
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function ReportBody({ report }: { report: DailyReportDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Report</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {report.teacherNote ? (
          <ReportTextSection title="Teacher note" body={report.teacherNote} />
        ) : null}
        {report.healthNote ? (
          <ReportTextSection title="Health note" body={report.healthNote} />
        ) : null}
        {report.items.length > 0 ? <ReportItems report={report} /> : null}
      </CardContent>
    </Card>
  );
}

function ReportTextSection({ body, title }: { body: string; title: string }) {
  return (
    <section>
      <h2 className="text-sm font-bold">{title}</h2>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
        {body}
      </p>
    </section>
  );
}

function ReportItems({ report }: { report: DailyReportDetail }) {
  return (
    <section className="grid gap-2 sm:grid-cols-2">
      {report.items.map((item) => (
        <div key={item.id} className="rounded-lg border p-3">
          <Badge variant="info">{reportItemTypeLabel(item.itemType)}</Badge>
          <p className="mt-2 font-semibold">
            {item.title || item.value || "Item"}
          </p>
          {item.value && item.title ? (
            <p className="text-sm text-muted-foreground">{item.value}</p>
          ) : null}
          {item.note ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {item.note}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function ReadReceipts({ report }: { report: DailyReportDetail }) {
  const readText =
    report.guardianCount > 0
      ? `${report.readCount} of ${report.guardianCount} guardians read`
      : "No guardians";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Read receipts</CardTitle>
        <CardDescription>{readText}</CardDescription>
      </CardHeader>
      <CardContent>
        {report.reads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No receipts yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {report.reads.map((read) => (
              <li key={read.id} className="py-2 first:pt-0 last:pb-0">
                <span className="font-semibold">{read.guardianName}</span>
                <span className="text-sm text-muted-foreground">
                  {" "}
                  · {read.readAt ? formatDateTime(read.readAt) : "Unread"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Comments({
  comment,
  onCommentChange,
  onSubmit,
  report,
  working,
}: {
  comment: string;
  onCommentChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  report: DailyReportDetail;
  working: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {report.status !== "published" ? (
          <p className="text-sm text-muted-foreground">
            Comments are available after publish.
          </p>
        ) : (
          <>
            <CommentList report={report} />
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
              <Textarea
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                placeholder="Write a comment"
              />
              <Button
                type="submit"
                className="w-fit"
                disabled={working || !comment.trim()}
              >
                <Send className="h-4 w-4" />
                Comment
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CommentList({ report }: { report: DailyReportDetail }) {
  if (report.comments.length === 0) {
    return <p className="text-sm text-muted-foreground">No comments yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {report.comments.map((row) => (
        <li key={row.id} className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{row.authorName}</p>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(row.createdAt)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {row.deletedAt ? "Comment deleted." : row.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
