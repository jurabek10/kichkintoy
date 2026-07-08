"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, School, Users } from "lucide-react";
import { toast } from "sonner";
import type { ClassListItem } from "@kichkintoy/shared";
import type { TFunction } from "i18next";
import { queryKeys } from "@/lib/query-keys";
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
import { KidsLoader } from "@/components/kids-loader";
import { SignedAvatar } from "@/components/signed-avatar";
import {
  Dialog,
  DialogContent,
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
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";

const CAPACITY_OPTIONS = [5, 10, 15, 20, 25, 30, 35] as const;

export function DirectorClasses({
  centerId,
}: {
  centerId: string | null;
}) {
  const { t } = useLayoutTranslation("classes");
  const { t: tApp } = useLayoutTranslation("app");
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [maxChildren, setMaxChildren] = useState("20");

  const {
    data: classes = [],
    isPending: loading,
    error: loadError,
  } = useQuery({
    queryKey: queryKeys.director.classes(centerId ?? ""),
    queryFn: () => orpc.director.classes({ centerId: centerId! }),
    enabled: !!centerId,
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      name: string;
      ageGroup?: string;
      academicYear?: string;
      maxChildren: 5 | 10 | 15 | 20 | 25 | 30 | 35;
    }) => orpc.director.createClass({ centerId: centerId!, body }),
    onSuccess: async () => {
      toast.success(t("classCreated", { name: name.trim() }));
      setOpen(false);
      setName("");
      setAgeGroup("");
      setAcademicYear("");
      setMaxChildren("20");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.director.classes(centerId ?? ""),
      });
    },
    onError: (err) => setFormError(toApiError(err).message),
  });

  const submitting = createMutation.isPending;
  const error =
    formError ?? (loadError ? toApiError(loadError).message : null);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!centerId) return;
    if (!name.trim()) {
      setFormError(t("classNameRequired"));
      return;
    }
    setFormError(null);
    createMutation.mutate({
      name: name.trim(),
      ageGroup: ageGroup.trim() || undefined,
      academicYear: academicYear.trim() || undefined,
      maxChildren: Number(maxChildren) as 5 | 10 | 15 | 20 | 25 | 30 | 35,
    });
  }

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>{t("noCenter")}</AlertDescription>
      </Alert>
    );
  }

  const activeClasses = classes.filter((c) => c.status === "active");
  const archivedClasses = classes.filter((c) => c.status === "archived");

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("newClass")}
          </Button>
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <KidsLoader label={t("loading")} size="sm" />
          </CardContent>
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
              <School className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold">{t("emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("emptyDescription")}
              </p>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("newClass")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeClasses.map((klass) => (
              <ClassCard key={klass.id} centerId={centerId} klass={klass} t={t} />
            ))}
          </div>

          {archivedClasses.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {t("archived")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archivedClasses.map((klass) => (
                  <ClassCard key={klass.id} centerId={centerId} klass={klass} t={t} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newClass")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={create} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="class-name">{t("className")}</Label>
              <Input
                id="class-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("classNamePlaceholder")}
                autoFocus
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="class-age">{t("ageGroupOptional")}</Label>
                <Input
                  id="class-age"
                  value={ageGroup}
                  onChange={(event) => setAgeGroup(event.target.value)}
                  placeholder={t("ageGroupPlaceholder")}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="class-year">{t("academicYearOptional")}</Label>
                <Input
                  id="class-year"
                  value={academicYear}
                  onChange={(event) => setAcademicYear(event.target.value)}
                  placeholder={t("academicYearPlaceholder")}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("maxChildren")}</Label>
              <Select value={maxChildren} onValueChange={setMaxChildren}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAPACITY_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {t("capacityOption", { count: value })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {tApp("actions.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("creating") : t("createClass")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClassCard({
  centerId,
  klass,
  t,
}: {
  centerId: string;
  klass: ClassListItem;
  t: TFunction<"classes">;
}) {
  return (
    <Link
      href={`/dashboard/classes/${klass.id}`}
      className="group block rounded-2xl border bg-card text-card-foreground shadow-card transition hover:border-primary/40 hover:shadow-pop"
    >
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
            <School className="h-5 w-5" />
          </span>
          {klass.status === "archived" ? (
            <Badge variant="secondary">{t("archived")}</Badge>
          ) : null}
        </div>
        <div>
          <p className="text-base font-bold">{klass.name}</p>
          <p className="text-sm text-muted-foreground">
            {[klass.ageGroup, klass.academicYear].filter(Boolean).join(" · ") ||
              "—"}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4" />
            {t("childCount", { count: klass.childCount })}
          </span>
          <span>{t("teacherCount", { count: klass.teacherCount })}</span>
          {klass.maxChildren ? (
            <span>{t("seatsUsed", { used: klass.childCount, total: klass.maxChildren })}</span>
          ) : null}
        </div>
        {klass.teachers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {klass.teachers.map((teacher) => (
              <Badge key={teacher.userId} variant="info" className="gap-1.5 py-0.5 pl-1">
                <SignedAvatar
                  mediaAssetId={teacher.avatarUrl}
                  name={teacher.fullName}
                  className="h-5 w-5 ring-0"
                  textClassName="text-[9px]"
                />
                {teacher.fullName}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Link>
  );
}
