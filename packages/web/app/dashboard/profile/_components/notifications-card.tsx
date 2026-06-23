"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProfileView } from "@kichkintoy/shared";
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
import { Switch } from "@/components/ui/switch";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";

export function NotificationsCard({ profile }: { profile: ProfileView }) {
  const { t } = useLayoutTranslation("profile");
  const queryClient = useQueryClient();
  const initial = profile.notificationSettings;

  const [pushEnabled, setPushEnabled] = useState(initial.pushEnabled);
  const [smsEnabled, setSmsEnabled] = useState(initial.smsEnabled);
  const [quietStart, setQuietStart] = useState(initial.quietHoursStart ?? "");
  const [quietEnd, setQuietEnd] = useState(initial.quietHoursEnd ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      orpc.profile.updateNotificationSettings({
        pushEnabled,
        smsEnabled,
        quietHoursStart: quietStart || null,
        quietHoursEnd: quietEnd || null,
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData(
        queryKeys.profile.me(),
        (current: ProfileView | undefined) =>
          current
            ? { ...current, notificationSettings: settings }
            : current,
      );
      toast.success(t("toasts.notificationsSaved"));
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notifications.title")}</CardTitle>
        <CardDescription>{t("notifications.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ToggleRow
          label={t("notifications.push")}
          hint={t("notifications.pushHint")}
          checked={pushEnabled}
          onChange={setPushEnabled}
        />
        <ToggleRow
          label={t("notifications.sms")}
          hint={t("notifications.smsHint")}
          checked={smsEnabled}
          onChange={setSmsEnabled}
        />

        <div className="space-y-2">
          <Label>{t("notifications.quietHours")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("notifications.quietHoursHint")}
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="time"
              aria-label={t("notifications.from")}
              className="w-[140px]"
              value={quietStart}
              onChange={(event) => setQuietStart(event.target.value)}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="time"
              aria-label={t("notifications.to")}
              className="w-[140px]"
              value={quietEnd}
              onChange={(event) => setQuietEnd(event.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t("actions.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
