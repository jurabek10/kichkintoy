"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Phone,
  School,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { ChildDetail } from "@kichkintoy/shared";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { KidsLoader } from "@/components/kids-loader";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { formatDateNumeric } from "@/lib/format";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const GENDER_UNSET = "unset";

export function DirectorChildDetail({ childId }: { childId: string }) {
  const { t } = useLayoutTranslation("classes");
  const { t: tApp } = useLayoutTranslation("app");
  const { session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const centerId = session?.membership.centerId ?? null;
  const canManage = session?.user.role === "director";

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<string>(GENDER_UNSET);
  const [allergies, setAllergies] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

  const detailKey = queryKeys.director.childDetail(centerId ?? "", childId);

  const {
    data: child = null,
    isPending,
    error,
  } = useQuery({
    queryKey: detailKey,
    queryFn: () => orpc.director.child({ centerId: centerId!, childId }),
    enabled: !!centerId,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      orpc.director.updateChild({
        centerId: centerId!,
        childId,
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim() || null,
          dateOfBirth,
          gender: gender === GENDER_UNSET ? null : (gender as ChildGenderValue),
          allergies: allergies.trim() || null,
          medicalNotes: medicalNotes.trim() || null,
        },
      }),
    onSuccess: async () => {
      toast.success(t("childDetail.childUpdated"));
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: detailKey });
    },
    onError: (err) => setFormError(toApiError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      orpc.director.deleteChild({ centerId: centerId!, childId }),
    onSuccess: async () => {
      toast.success(t("childDetail.childRemoved"));
      setDeleteOpen(false);
      if (centerId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.director.classes(centerId),
        });
      }
      router.push("/dashboard/classes");
    },
    onError: (err) => setFormError(toApiError(err).message),
  });

  function openEdit() {
    if (!child) return;
    setFirstName(child.firstName);
    setLastName(child.lastName ?? "");
    setDateOfBirth(child.dateOfBirth ?? "");
    setGender(child.gender ?? GENDER_UNSET);
    setAllergies(child.allergies ?? "");
    setMedicalNotes(child.medicalNotes ?? "");
    setFormError(null);
    setEditOpen(true);
  }

  function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!centerId) return;
    if (!firstName.trim() || !dateOfBirth) return;
    updateMutation.mutate();
  }

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  if (isPending) {
    return (
      <Card>
        <CardContent className="p-6">
          <KidsLoader label={t("loading")} size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (error || !child) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink href="/dashboard/classes" label={t("childDetail.back")} />
        <Alert variant="destructive">
          <AlertDescription>
            {error
              ? toApiError(error).message
              : t("childDetail.loadFailed")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const inactive = child.status !== "active";
  const backHref = child.enrollment?.classId
    ? `/dashboard/classes/${child.enrollment.classId}`
    : "/dashboard/classes";
  const backLabel = child.enrollment?.classId
    ? t("childDetail.backToClass")
    : t("childDetail.back");

  return (
    <div className="flex flex-col gap-4">
      <BackLink href={backHref} label={backLabel} />

      {/* Identity header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <ChildAvatar name={child.name} photoUrl={child.photoUrl} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold tracking-tight">
                  {child.name}
                </h2>
                <Badge variant={inactive ? "secondary" : "success"}>
                  {inactive
                    ? t("childDetail.statusInactive")
                    : t("childDetail.statusActive")}
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <School className="h-3.5 w-3.5" />
                  {child.enrollment?.className ?? t("childDetail.noClass")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {ageLabel(child.dateOfBirth, t) ??
                    t("childDetail.notProvided")}
                </span>
                <span>{genderLabel(child.gender, t)}</span>
              </div>
            </div>
          </div>

          {canManage ? (
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="h-4 w-4" />
                {t("childDetail.edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormError(null);
                  setDeleteOpen(true);
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {t("childDetail.delete")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Child information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {t("childDetail.infoTitle")}
            </CardTitle>
            <CardDescription>{t("childDetail.infoDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              <Field label={t("childDetail.fields.firstName")}>
                {child.firstName}
              </Field>
              <Field label={t("childDetail.fields.lastName")}>
                {child.lastName || t("childDetail.notProvided")}
              </Field>
              <Field label={t("childDetail.fields.dateOfBirth")}>
                <span className="nums">
                  {formatDateNumeric(child.dateOfBirth)}
                </span>
              </Field>
              <Field label={t("childDetail.fields.gender")}>
                {genderLabel(child.gender, t)}
              </Field>
              <Field label={t("childDetail.fields.class")}>
                {child.enrollment?.className ?? t("childDetail.noClass")}
              </Field>
              <Field label={t("childDetail.fields.joined")}>
                <span className="nums">
                  {child.enrollment?.startedAt
                    ? formatDateNumeric(child.enrollment.startedAt)
                    : t("childDetail.notProvided")}
                </span>
              </Field>
              <Field label={t("childDetail.fields.allergies")} full>
                {child.allergies || t("childDetail.notProvided")}
              </Field>
              <Field label={t("childDetail.fields.medicalNotes")} full last>
                {child.medicalNotes || t("childDetail.notProvided")}
              </Field>
            </dl>
          </CardContent>
        </Card>

        {/* Guardians */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              {t("childDetail.guardiansTitle")}
            </CardTitle>
            <CardDescription>
              {t("childDetail.guardiansDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {child.guardians.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("childDetail.noGuardians")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {child.guardians.map((guardian) => (
                  <li
                    key={guardian.userId}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-semibold">
                          {guardian.fullName}
                        </span>
                        {guardian.relationship ? (
                          <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                            {relationLabel(guardian.relationship, tApp)}
                          </span>
                        ) : null}
                        {guardian.isPrimary ? (
                          <Badge variant="info">
                            {t("childDetail.primary")}
                          </Badge>
                        ) : null}
                      </div>
                      {guardian.phone ? (
                        <a
                          href={`tel:${guardian.phone}`}
                          dir="ltr"
                          className="nums mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {guardian.phone}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t("childDetail.noPhone")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("childDetail.editTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="child-first">
                  {t("childDetail.fields.firstName")}
                </Label>
                <Input
                  id="child-first"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="child-last">
                  {t("childDetail.lastNameOptional")}
                </Label>
                <Input
                  id="child-last"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="child-dob">
                  {t("childDetail.fields.dateOfBirth")}
                </Label>
                <Input
                  id="child-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="child-gender">
                  {t("childDetail.fields.gender")}
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="child-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boy">{t("gender.boy")}</SelectItem>
                    <SelectItem value="girl">{t("gender.girl")}</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      {t("gender.prefer_not_to_say")}
                    </SelectItem>
                    <SelectItem value={GENDER_UNSET}>
                      {t("childDetail.notProvided")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="child-allergies">
                {t("childDetail.fields.allergies")}
              </Label>
              <Textarea
                id="child-allergies"
                value={allergies}
                rows={2}
                onChange={(event) => setAllergies(event.target.value)}
                placeholder={t("childDetail.allergiesPlaceholder")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="child-medical">
                {t("childDetail.fields.medicalNotes")}
              </Label>
              <Textarea
                id="child-medical"
                value={medicalNotes}
                rows={3}
                onChange={(event) => setMedicalNotes(event.target.value)}
                placeholder={t("childDetail.medicalNotesPlaceholder")}
              />
            </div>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                {tApp("actions.cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending
                  ? t("childDetail.saving")
                  : tApp("actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("childDetail.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("childDetail.deleteBody", { name: child.name })}
            </DialogDescription>
          </DialogHeader>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              {tApp("actions.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? t("childDetail.deleting")
                : t("childDetail.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ChildGenderValue = NonNullable<ChildDetail["gender"]>;

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

function Field({
  label,
  children,
  full,
  last,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b border-border/70 py-3",
        full ? "sm:col-span-2" : null,
        last ? "border-b-0 pb-0 sm:pb-0" : null,
      )}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function ChildAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent text-xl font-bold text-accent-foreground">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function genderLabel(value: string | null, t: TFunction<"classes">) {
  if (value === "boy") return t("gender.boy");
  if (value === "girl") return t("gender.girl");
  if (value === "prefer_not_to_say") return t("gender.prefer_not_to_say");
  return t("childDetail.notProvided");
}

function relationLabel(value: string, tApp: TFunction<"app">) {
  return tApp(`signup.relationshipOptions.${value}`, { defaultValue: value });
}

function ageLabel(
  dateOfBirth: string | null,
  t: TFunction<"classes">,
): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    years -= 1;
  }
  if (years < 0) return null;
  return t("childDetail.ageYears", { count: years });
}
