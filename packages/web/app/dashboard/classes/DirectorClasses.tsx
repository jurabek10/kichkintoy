"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Plus, School, Users } from "lucide-react";
import { toast } from "sonner";
import type { ClassListItem } from "@kichkintoy/shared";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiRequest } from "@/lib/api";

export function DirectorClasses({
  centerId,
}: {
  centerId: string | null;
}) {
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await apiRequest<ClassListItem[]>(
        `/director/centers/${centerId}/classes`,
        { auth: true },
      );
      setClasses(rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load classes.");
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!centerId) return;
    if (!name.trim()) {
      setError("Class name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest(`/director/centers/${centerId}/classes`, {
        method: "POST",
        auth: true,
        body: {
          name: name.trim(),
          ageGroup: ageGroup.trim() || undefined,
          academicYear: academicYear.trim() || undefined,
        },
      });
      toast.success(`Class "${name.trim()}" created.`);
      setOpen(false);
      setName("");
      setAgeGroup("");
      setAcademicYear("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create class.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!centerId) {
    return (
      <Alert variant="warning">
        <AlertDescription>
          Your account is not linked to a center yet.
        </AlertDescription>
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
            <CardTitle className="text-xl">Classes</CardTitle>
            <CardDescription>
              Create your kindergarten's classes and assign teachers to them.
            </CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New class
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
              <p className="font-bold">No classes yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first class to start assigning teachers and children.
              </p>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              New class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeClasses.map((klass) => (
              <ClassCard key={klass.id} centerId={centerId} klass={klass} />
            ))}
          </div>

          {archivedClasses.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Archived
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archivedClasses.map((klass) => (
                  <ClassCard key={klass.id} centerId={centerId} klass={klass} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New class</DialogTitle>
          </DialogHeader>
          <form onSubmit={create} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="class-name">Class name</Label>
              <Input
                id="class-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Quyoshcha"
                autoFocus
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="class-age">Age group (optional)</Label>
                <Input
                  id="class-age"
                  value={ageGroup}
                  onChange={(event) => setAgeGroup(event.target.value)}
                  placeholder="3–4"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="class-year">Academic year (optional)</Label>
                <Input
                  id="class-year"
                  value={academicYear}
                  onChange={(event) => setAcademicYear(event.target.value)}
                  placeholder="2026"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create class"}
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
}: {
  centerId: string;
  klass: ClassListItem;
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
            <Badge variant="secondary">Archived</Badge>
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
            {klass.childCount} {klass.childCount === 1 ? "child" : "children"}
          </span>
          <span>
            {klass.teacherCount}{" "}
            {klass.teacherCount === 1 ? "teacher" : "teachers"}
          </span>
        </div>
        {klass.teachers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {klass.teachers.map((teacher) => (
              <Badge key={teacher.userId} variant="info">
                {teacher.fullName}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Link>
  );
}
