"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { DailyReportDetail } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
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
import { CommentAvatar } from "@/components/comment-avatar";
import { CommentAttachments } from "@/components/comment-attachments";
import { CommentAttachmentPicker, uploadCommentAttachments, type PendingCommentAttachment } from "@/components/comment-attachment-picker";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import {
  REPORT_COMMENT_MUTATION_KEY,
  type ReportCommentVars,
} from "@/lib/offline-mutations";
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatWeekdayShort,
  participationInterestLabel,
  participationLevelLabel,
  reportItemTypeLabel,
  reportStatusLabel,
} from "@/lib/format";
import { SignedReportMedia } from "./signed-report-media";
import { moodEmoji, reportTimestamp } from "./report-utils";
import { translateItemTitle, translateItemValue } from "./report-item-i18n";

export function ReportDetailScreen({
  isParent,
  reportId,
}: {
  isParent: boolean;
  reportId: string;
}) {
  const { t } = useLayoutTranslation("reports");
  const { t: tc } = useLayoutTranslation("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [edit, setEdit] = useState({
    mood: "",
    teacherNote: "",
    healthNote: "",
  });
  const [comment, setComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<PendingCommentAttachment[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const reportKey = queryKeys.reports.detail(reportId, isParent);

  const {
    data: report = null,
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: reportKey,
    queryFn: () =>
      isParent
        ? orpc.reports.parentDetail({ reportId })
        : orpc.reports.teacherDetail({ reportId }),
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
    setActionError(err instanceof Error ? err.message : message);

  const saveMutation = useMutation({
    mutationFn: () => orpc.reports.update({ reportId, body: edit }),
    onSuccess: async () => {
      toast.success(t("detail.reportUpdated"));
      await invalidateReport();
    },
    onError: onActionError(t("detail.couldNotUpdate")),
  });

  const publishMutation = useMutation({
    mutationFn: () => orpc.reports.publish({ reportId, body: {} }),
    onSuccess: async () => {
      toast.success(t("detail.reportPublished"));
      await invalidateReport();
    },
    onError: onActionError(t("detail.couldNotPublish")),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => orpc.reports.unpublish({ reportId }),
    onSuccess: async () => {
      toast(t("detail.movedToDraft"));
      await invalidateReport();
    },
    onError: onActionError(t("detail.couldNotUnpublish")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => orpc.reports.delete({ reportId }),
    onSuccess: async () => {
      toast(t("detail.reportDeleted"));
      await queryClient.invalidateQueries({ queryKey: ["teacher"] });
      router.push("/dashboard/reports");
    },
    onError: onActionError(t("detail.couldNotDelete")),
  });

  // Offline-capable: uses the keyed default registered in providers, so a
  // comment written offline is queued, persisted, and replayed on reconnect.
  const commentMutation = useMutation<unknown, Error, ReportCommentVars>({
    mutationKey: REPORT_COMMENT_MUTATION_KEY,
    onSuccess: () => invalidateReport(),
    onError: onActionError(t("detail.couldNotComment")),
  });

  const working =
    saveMutation.isPending ||
    publishMutation.isPending ||
    unpublishMutation.isPending ||
    deleteMutation.isPending ||
    commentMutation.isPending;
  const error =
    actionError ?? (loadError ? toApiError(loadError).message : null);

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

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = comment.trim();
    if (!body && commentAttachments.length === 0) return;
    setActionError(null);
    try {
      const attachmentMediaAssetIds = report ? await uploadCommentAttachments(report.centerId, commentAttachments) : [];
      await commentMutation.mutateAsync({ reportId, isParent, body, attachmentMediaAssetIds, idempotencyKey: crypto.randomUUID() });
      setComment("");
      setCommentAttachments([]);
    } catch (error) {
      setActionError(toApiError(error).message);
    }
  }

  if (loading) return <LoadingCard t={t} />;
  if (!report) return <MissingReport error={error} t={t} />;

  return (
    <div className="flex flex-col gap-4">
      <BackToReports t={t} />
      {isParent ? (
        <ParentReportHero report={report} t={t} />
      ) : (
        <ReportHeader
          isParent={isParent}
          report={report}
          t={t}
          working={working}
          onDelete={removeReport}
          onPublish={publish}
          onUnpublish={unpublish}
        />
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isParent ? (
        <ReportEditForm
          edit={edit}
          t={t}
          working={working}
          onChange={setEdit}
          onSubmit={save}
        />
      ) : null}

      <ReportBody report={report} t={t} />

      {!isParent ? <ReadReceipts report={report} t={t} /> : null}

      <Comments
        comment={comment}
        attachments={commentAttachments}
        report={report}
        t={t}
        working={working}
        onCommentChange={setComment}
        onAttachmentsChange={setCommentAttachments}
        commonT={tc}
        onSubmit={addComment}
      />
    </div>
  );
}

function LoadingCard({ t }: { t: TFunction<"reports"> }) {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-muted-foreground">
        {t("detail.loading")}
      </CardContent>
    </Card>
  );
}

function MissingReport({
  error,
  t,
}: {
  error: string | null;
  t: TFunction<"reports">;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{error ?? t("detail.notFound")}</AlertDescription>
    </Alert>
  );
}

function BackToReports({ t }: { t: TFunction<"reports"> }) {
  return (
    <Link
      href="/dashboard/reports"
      className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("back")}
    </Link>
  );
}

function ReportHeader({
  isParent,
  onDelete,
  onPublish,
  onUnpublish,
  report,
  t,
  working,
}: {
  isParent: boolean;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  report: DailyReportDetail;
  t: TFunction<"reports">;
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
            <ReportStatusBadge status={report.status} t={t} />
          </div>
          <CardDescription>
            {report.class.name} · {t("detail.author")} {report.author.fullName}
            {report.publishedAt
              ? ` · ${t("detail.publishedAt", {
                  date: formatDateTime(report.publishedAt),
                })}`
              : ""}
          </CardDescription>
        </div>
        {!isParent ? (
          <div className="flex flex-wrap gap-2">
            {report.status !== "published" ? (
              <Button type="button" onClick={onPublish} disabled={working}>
                {t("detail.publish")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onUnpublish}
                disabled={working}
              >
                {t("detail.unpublish")}
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
              {t("detail.delete")}
            </Button>
          </div>
        ) : null}
      </CardHeader>
    </Card>
  );
}

/** The parent's view opens on a warm coral hero — child, date rail and mood —
 *  so reading a report on web feels like the mobile screen, not an admin form. */
function ParentReportHero({
  report,
  t,
}: {
  report: DailyReportDetail;
  t: TFunction<"reports">;
}) {
  const date = reportTimestamp(report);
  return (
    <Card className="overflow-hidden border-coral/30">
      <div className="flex items-center gap-4 bg-gradient-to-br from-coral/10 via-coral/5 to-transparent p-5">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-coral/15 text-4xl shadow-sm">
          {moodEmoji(report.mood)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-coral-ink">
            {formatWeekdayShort(date)} · {formatTime(date)}
          </p>
          <h1 className="truncate text-xl font-extrabold text-foreground">
            {report.child.name}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {formatDate(report.reportDate)} · {report.class.name} ·{" "}
            {report.author.fullName}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ReportStatusBadge({
  status,
  t,
}: {
  status: DailyReportDetail["status"];
  t: TFunction<"reports">;
}) {
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
      {t(`status.${status}`, reportStatusLabel(status))}
    </Badge>
  );
}

function ReportEditForm({
  edit,
  onChange,
  onSubmit,
  t,
  working,
}: {
  edit: { mood: string; teacherNote: string; healthNote: string };
  onChange: (value: {
    mood: string;
    teacherNote: string;
    healthNote: string;
  }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  t: TFunction<"reports">;
  working: boolean;
}) {
  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("detail.editReport")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mood">{t("detail.mood")}</Label>
            <Input
              id="mood"
              value={edit.mood}
              onChange={(event) =>
                onChange({ ...edit, mood: event.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="teacher-note">{t("detail.teacherNote")}</Label>
            <Textarea
              id="teacher-note"
              value={edit.teacherNote}
              onChange={(event) =>
                onChange({ ...edit, teacherNote: event.target.value })
              }
              rows={12}
              className="min-h-[240px]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="health-note">{t("detail.healthNote")}</Label>
            <Textarea
              id="health-note"
              value={edit.healthNote}
              onChange={(event) =>
                onChange({ ...edit, healthNote: event.target.value })
              }
            />
          </div>
          <Button type="submit" disabled={working} className="w-fit">
            {t("detail.saveChanges")}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function ReportBody({
  report,
  t,
}: {
  report: DailyReportDetail;
  t: TFunction<"reports">;
}) {
  const standardItems = report.items.filter(
    (item) => item.itemType !== "class_participation",
  );
  const participationItems = report.items.filter(
    (item) => item.itemType === "class_participation",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("detail.report")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {report.teacherNote ? (
          <ReportTextSection
            title={t("detail.teacherNote")}
            body={report.teacherNote}
          />
        ) : null}
        {report.healthNote ? (
          <ReportTextSection
            title={t("detail.healthNote")}
            body={report.healthNote}
          />
        ) : null}
        {standardItems.length > 0 ? (
          <ReportItems items={standardItems} t={t} />
        ) : null}
        {participationItems.length > 0 ? (
          <ClassParticipationItems items={participationItems} t={t} />
        ) : null}
        {report.photos.length > 0 ? (
          <ReportMedia report={report} t={t} />
        ) : null}
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

function ReportItems({
  items,
  t,
}: {
  items: DailyReportDetail["items"];
  t: TFunction<"reports">;
}) {
  return (
    <section className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const title = translateItemTitle(item.title, t);
        const value = translateItemValue(item.itemType, item.value, t);
        return (
          <div key={item.id} className="rounded-lg border p-3">
            <Badge variant="info">
              {t(
                `itemTypes.${item.itemType}`,
                reportItemTypeLabel(item.itemType),
              )}
            </Badge>
            <p className="mt-2 font-semibold">
              {title || value || t("detail.item")}
            </p>
            {value && title ? (
              <p className="text-sm text-muted-foreground">{value}</p>
            ) : null}
            {item.note ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {item.note}
              </p>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

function ReportMedia({
  report,
  t,
}: {
  report: DailyReportDetail;
  t: TFunction<"reports">;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold">{t("detail.photosVideos")}</h2>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {report.photos.map((media) => (
          <SignedReportMedia
            key={media.id}
            mediaAssetId={media.id}
            mediaType={media.mediaType}
          />
        ))}
      </div>
    </section>
  );
}

function ClassParticipationItems({
  items,
  t,
}: {
  items: DailyReportDetail["items"];
  t: TFunction<"reports">;
}) {
  return (
    <section>
      <h2 className="text-sm font-bold">{t("detail.classParticipation")}</h2>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {items.map((item) => {
          const note = parseClassParticipationNote(item.note);
          return (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">
                  {item.title
                    ? t(`participation.subjects.${item.title}`, {
                        defaultValue: item.title,
                      })
                    : t("detail.subject")}
                </p>
                {item.value ? (
                  <Badge variant="info">
                    {t(
                      `participationLevels.${item.value}`,
                      participationLevelLabel(item.value),
                    )}
                  </Badge>
                ) : null}
                {note?.interest ? (
                  <Badge variant="outline">
                    {t("detail.interest", {
                      level: t(
                        `participationInterests.${note.interest}`,
                        participationInterestLabel(note.interest),
                      ),
                    })}
                  </Badge>
                ) : null}
              </div>
              <dl className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {note?.strengths ? (
                  <ClassParticipationField
                    label={t("detail.strengths")}
                    value={note.strengths}
                  />
                ) : null}
                {note?.needsPractice ? (
                  <ClassParticipationField
                    label={t("detail.needsPractice")}
                    value={note.needsPractice}
                  />
                ) : null}
                {note?.homeSuggestion ? (
                  <ClassParticipationField
                    label={t("detail.homePractice")}
                    value={note.homeSuggestion}
                  />
                ) : null}
                {note?.teacherNote ? (
                  <ClassParticipationField
                    label={t("detail.teacherNote")}
                    value={note.teacherNote}
                  />
                ) : null}
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ClassParticipationField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="font-semibold text-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function parseClassParticipationNote(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as {
      interest?: string;
      strengths?: string;
      needsPractice?: string;
      homeSuggestion?: string;
      teacherNote?: string;
    };
    return parsed;
  } catch {
    return { teacherNote: value };
  }
}

function ReadReceipts({
  report,
  t,
}: {
  report: DailyReportDetail;
  t: TFunction<"reports">;
}) {
  const readText =
    report.guardianCount > 0
      ? t("detail.guardiansRead", {
          read: report.readCount,
          total: report.guardianCount,
        })
      : t("detail.noGuardians");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("detail.readReceipts")}</CardTitle>
        <CardDescription>{readText}</CardDescription>
      </CardHeader>
      <CardContent>
        {report.reads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("detail.noReceipts")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {report.reads.map((read) => (
              <li key={read.id} className="py-2 first:pt-0 last:pb-0">
                <span className="font-semibold">{read.guardianName}</span>
                <span className="text-sm text-muted-foreground">
                  {" "}
                  ·{" "}
                  {read.readAt
                    ? formatDateTime(read.readAt)
                    : t("detail.unread")}
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
  attachments,
  comment,
  commonT,
  onAttachmentsChange,
  onCommentChange,
  onSubmit,
  report,
  t,
  working,
}: {
  comment: string;
  attachments: PendingCommentAttachment[];
  commonT: TFunction<"common">;
  onAttachmentsChange: (value: PendingCommentAttachment[]) => void;
  onCommentChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  report: DailyReportDetail;
  t: TFunction<"reports">;
  working: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          {t("detail.comments")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {report.status !== "published" ? (
          <p className="text-sm text-muted-foreground">
            {t("detail.commentsAfterPublish")}
          </p>
        ) : (
          <>
            <CommentList report={report} t={t} />
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
              <CommentAttachmentPicker value={attachments} onChange={onAttachmentsChange} labels={{ addPhoto: commonT("comments.addPhoto"), addVideo: commonT("comments.addVideo"), addFile: commonT("comments.addFile"), limit: commonT("comments.attachmentLimit", { count: 4 }), tooLarge: commonT("comments.attachmentTooLarge") }} />
              <Textarea
                value={comment}
                onChange={(event) => onCommentChange(event.target.value)}
                placeholder={t("detail.writeComment")}
              />
              <Button
                type="submit"
                className="w-fit"
                disabled={working || (!comment.trim() && attachments.length === 0)}
              >
                <Send className="h-4 w-4" />
                {t("detail.comment")}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CommentList({
  report,
  t,
}: {
  report: DailyReportDetail;
  t: TFunction<"reports">;
}) {
  if (report.comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("detail.noComments")}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {report.comments.map((row) => (
        <li key={row.id} className="rounded-lg border p-3">
          <div className="flex items-center gap-2.5">
            <CommentAvatar
              name={row.authorDisplayName}
              mediaAssetId={row.authorPhotoMediaAssetId}
              photoUrl={row.authorPhotoUrl}
              className="h-8 w-8 text-[10px]"
            />
            <p className="font-semibold">{row.authorDisplayName}</p>
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDateTime(row.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
            {row.deletedAt ? t("detail.commentDeleted") : row.body}
          </p>
          {!row.deletedAt ? <CommentAttachments attachments={row.attachments} /> : null}
        </li>
      ))}
    </ul>
  );
}
