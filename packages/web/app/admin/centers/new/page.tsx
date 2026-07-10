"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import {
  CenterForm,
  emptyCenterForm,
  toAdminCenterFields,
  type CenterFormValues,
} from "../_components/center-form";

export default function NewCenterPage() {
  const { t } = useLayoutTranslation("admin");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<CenterFormValues>(emptyCenterForm);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      orpc.admin.centers.create({ body: toAdminCenterFields(values) }),
    onSuccess: async (created) => {
      toast.success(t("form.created", { code: created.centerCode }));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.centers(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.overview(),
      });
      router.replace(`/admin/centers/${created.id}`);
    },
    onError: (err) => setError(toApiError(err).message),
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1 px-2">
          <Link href="/admin/centers">
            <ArrowLeft className="h-4 w-4" />
            {t("detail.back")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("form.createTitle")}</CardTitle>
          <CardDescription>{t("form.createDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CenterForm
            idPrefix="new-center"
            values={values}
            onChange={setValues}
            onSubmit={() => {
              setError(null);
              createMutation.mutate();
            }}
            onCancel={() => router.push("/admin/centers")}
            submitLabel={t("form.create")}
            submittingLabel={t("form.creating")}
            submitting={createMutation.isPending}
            error={error}
          />
        </CardContent>
      </Card>
    </div>
  );
}
