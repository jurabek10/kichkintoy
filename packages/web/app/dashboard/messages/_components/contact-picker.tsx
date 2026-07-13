"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MailPlus } from "lucide-react";
import { toast } from "sonner";
import type { MessageContact } from "@kichkintoy/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { orpc } from "@/lib/orpc";
import { queryKeys } from "@/lib/query-keys";
import { MessageAvatar } from "./message-avatar";
import { messageIdentityParts } from "./message-identity";

export function ContactPicker() {
  const { t } = useLayoutTranslation("messages");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MessageContact | null>(null);
  const [body, setBody] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.messages.contacts(),
    queryFn: () => orpc.messages.contacts({}),
    enabled: open,
  });
  const start = useMutation({
    mutationFn: () =>
      orpc.messages.startThread({
        recipientUserId: selected!.userId,
        centerId: selected!.centerId,
        body,
      }),
    onSuccess: (detail) => {
      setOpen(false);
      router.push(`/dashboard/messages/${detail.thread.threadId}`);
    },
    onError: () => toast.error(t("sendError")),
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSelected(null);
      setBody("");
    }
  };
  const selectedIdentity = selected ? messageIdentityParts(selected, t) : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button><MailPlus className="h-4 w-4" />{t("newMessage")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{selectedIdentity?.primary ?? t("chooseContact")}</DialogTitle></DialogHeader>
        {selected && selectedIdentity ? (
          <div className="space-y-4">
            <button type="button" className="flex items-center gap-3 text-left" onClick={() => setSelected(null)}>
              <MessageAvatar name={selectedIdentity.primary} photoMediaAssetId={selected.photoMediaAssetId} photoUrl={selected.photoUrl} />
              <span><span className="block font-semibold">{selectedIdentity.primary}</span><span className="text-sm text-muted-foreground">{selectedIdentity.secondary ?? t(`roles.${selected.role}`)}</span></span>
            </button>
            <Textarea
              autoFocus
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              placeholder={t("firstMessage")}
              className="min-h-28"
            />
            <Button className="w-full" disabled={!body.trim() || start.isPending} onClick={() => start.mutate()}>
              {start.isPending ? t("sending") : t("send")}
            </Button>
          </div>
        ) : isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("loading")}</p>
        ) : !data?.some((group) => group.contacts.length) ? (
          <div className="py-8 text-center"><p className="font-semibold">{t("noContacts")}</p><p className="mt-1 text-sm text-muted-foreground">{t("noContactsBody")}</p></div>
        ) : (
          <div className="space-y-5">
            {data.map((group) => (
              <section key={group.centerId}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                <div className="space-y-1">
                  {group.contacts.map((person) => {
                    const identity = messageIdentityParts(person, t);
                    return (
                    <button key={`${person.centerId}:${person.userId}`} type="button" onClick={() => setSelected(person)} className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <MessageAvatar name={identity.primary} photoMediaAssetId={person.photoMediaAssetId} photoUrl={person.photoUrl} />
                      <span className="min-w-0"><span className="block truncate font-semibold">{identity.primary}</span><span className="block truncate text-sm text-muted-foreground">{identity.secondary ?? t(`roles.${person.role}`)}</span></span>
                    </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
