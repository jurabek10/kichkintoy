"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { StudentDocumentTemplateSummary } from "@kichkintoy/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { toApiError } from "@/lib/api/errors";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { buildDefaultMedicalFields, templateTypeKey } from "./document-utils";

type ChildOption = { id: string; name: string };
type ClassOption = { id: string; name: string };

export function RequestComposerDialog({
  centerId,
  templates,
  classes,
  children,
  /** Directors can spin up a starter template inline; teachers only reuse existing ones. */
  canCreateTemplate = true,
  /** Directors can target the whole center; teachers are scoped to a class or child. */
  allowCenterTarget = true,
}: {
  centerId: string;
  templates: StudentDocumentTemplateSummary[];
  classes: ClassOption[];
  children: ChildOption[];
  canCreateTemplate?: boolean;
  allowCenterTarget?: boolean;
}) {
  const { t } = useLayoutTranslation("documents");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(t("defaultTitle"));
  const [targetType, setTargetType] = useState<"center" | "class" | "child">(
    "class",
  );
  const [templateId, setTemplateId] = useState("");
  const [classId, setClassId] = useState("");
  const [childId, setChildId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState(t("defaultInstructions"));

  const createTemplate = useMutation({
    mutationFn: () =>
      orpc.studentDocuments.createTemplate({
        centerId,
        title,
        description: t("templateDescription"),
        templateType: "medical_allergy",
        status: "active",
        fields: buildDefaultMedicalFields(t),
      }),
    onSuccess: async (template) => {
      toast.success(t("toast.templateCreated"));
      setTemplateId(template.id);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.studentDocuments.all(),
      });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const sendRequest = useMutation({
    mutationFn: () =>
      orpc.studentDocuments.sendRequest({
        centerId,
        templateId,
        targetType,
        title,
        instructions: instructions || undefined,
        dueDate: dueDate || undefined,
        classIds: targetType === "class" && classId ? [classId] : undefined,
        childIds: targetType === "child" && childId ? [childId] : undefined,
      }),
    onSuccess: async () => {
      toast.success(t("toast.requestSent"));
      setOpen(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.studentDocuments.all(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount(),
      });
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  const canSend =
    !sendRequest.isPending &&
    !!templateId &&
    !(targetType === "class" && !classId) &&
    !(targetType === "child" && !childId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="h-4 w-4" />
          {t("actions.newRequest")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("composer.title")}</DialogTitle>
          <DialogDescription>{t("composer.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="doc-title">{t("composer.titleLabel")}</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t("composer.template")}</Label>
            {templates.length > 0 ? (
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("composer.chooseTemplate")} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title} ·{" "}
                      {t(templateTypeKey(template.templateType))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("composer.noTemplate")}
              </p>
            )}
            {canCreateTemplate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-start"
                disabled={createTemplate.isPending || !title.trim()}
                onClick={() => createTemplate.mutate()}
              >
                {templates.length > 0 ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {t("composer.createTemplate")}
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>{t("composer.target")}</Label>
            <Select
              value={targetType}
              onValueChange={(value) =>
                setTargetType(value as "center" | "class" | "child")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowCenterTarget ? (
                  <SelectItem value="center">{t("target.center")}</SelectItem>
                ) : null}
                <SelectItem value="class">{t("target.class")}</SelectItem>
                <SelectItem value="child">{t("target.child")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === "class" ? (
            <div className="grid gap-2">
              <Label>{t("composer.class")}</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("composer.chooseClass")} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {targetType === "child" ? (
            <div className="grid gap-2">
              <Label>{t("composer.child")}</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("composer.chooseChild")} />
                </SelectTrigger>
                <SelectContent>
                  {children.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="due-date">{t("composer.dueDate")}</Label>
            <DatePicker id="due-date" value={dueDate} onValueChange={setDueDate} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="instructions">{t("composer.instructions")}</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            {t("composer.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canSend}
            onClick={() => sendRequest.mutate()}
          >
            <Send className="h-4 w-4" />
            {t("composer.sendRequest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
