"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, School } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { ClassRosterChild } from "@kichkintoy/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KidsLoader } from "@/components/kids-loader";
import { DataTable } from "@/components/ui/data-table";
import { PageHeading } from "@/components/page-heading";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { buildChildColumns, ChildrenTableToolbar } from "./child-columns";

export function TeacherClassDetail({ classId }: { classId: string }) {
  const { t } = useLayoutTranslation("classes");
  const { t: tApp } = useLayoutTranslation("app");
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [childToDelete, setChildToDelete] = useState<{
    childId: string;
    name: string;
  } | null>(null);

  const childrenKey = queryKeys.teacher.classChildren(classId);

  // The class header reuses the cached class list — no extra round-trip for the
  // name/age-group the teacher just tapped through from.
  const { data: classes = [] } = useQuery({
    queryKey: queryKeys.teacher.classes(),
    queryFn: () => orpc.teacher.classes(),
  });
  const klass = classes.find((item) => item.id === classId) ?? null;

  const {
    data: children = [],
    isPending: loading,
    error: queryError,
  } = useQuery({
    queryKey: childrenKey,
    queryFn: () => orpc.teacher.classChildren({ classId }),
  });

  const deleteChildMutation = useMutation({
    mutationFn: (childId: string) => orpc.teacher.deleteChild({ childId }),
    onSuccess: async () => {
      toast.success(t("childDetail.childRemoved"));
      setChildToDelete(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: childrenKey }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.teacher.classes(),
        }),
      ]);
    },
    onError: (err) => setActionError(toApiError(err).message),
  });

  const childColumns = useMemo<ColumnDef<ClassRosterChild>[]>(
    () =>
      buildChildColumns({
        t,
        tApp,
        onDelete: setChildToDelete,
        showJoined: false,
      }),
    [t, tApp],
  );

  const meta =
    [klass?.ageGroup, klass?.academicYear].filter(Boolean).join(" · ") ||
    t("childrenTitle", { count: children.length });
  const error =
    actionError ?? (queryError ? toApiError(queryError).message : null);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard/classes"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("myTitle")}
      </Link>

      <Card>
        <CardHeader>
          <PageHeading
            Icon={School}
            tone="mint"
            title={klass?.name ?? t("childrenTitle", { count: children.length })}
            description={meta}
          />
        </CardHeader>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <h3 className="text-base font-bold text-foreground">
            {t("childrenTitle", { count: children.length })}
          </h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <KidsLoader label={t("loading")} size="sm" />
          ) : (
            <DataTable
              columns={childColumns}
              data={children}
              emptyMessage={t("noChildrenInClass")}
              initialColumnVisibility={{ gender: false }}
              toolbar={(table) => (
                <ChildrenTableToolbar table={table} t={t} />
              )}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!childToDelete}
        onOpenChange={(open) => {
          if (!open) setChildToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("childDetail.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("childDetail.deleteBody", { name: childToDelete?.name ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setChildToDelete(null)}
            >
              {tApp("actions.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteChildMutation.isPending}
              onClick={() => {
                if (childToDelete) {
                  deleteChildMutation.mutate(childToDelete.childId);
                }
              }}
            >
              {deleteChildMutation.isPending
                ? t("childDetail.deleting")
                : t("childDetail.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
