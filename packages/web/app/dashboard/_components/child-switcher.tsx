"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronDown, Clock, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";
import { useSelectedChild } from "@/lib/selected-child";
import { cn } from "@/lib/utils";
import { ChildAvatar } from "../profile/_components/child-avatar";

// Stable candy accent per sibling — the same palette the profile page uses,
// so a kid keeps one ring colour everywhere.
const RING_COLORS = [
  "ring-sky",
  "ring-bubblegum",
  "ring-grape",
  "ring-mint",
  "ring-coral",
];

/**
 * The header kid switcher (Kidsnote-style): the selected kid's photo + name
 * where the parent greeting used to be. Opens the kid list — including kids at
 * other kindergartens and pending "add a kid" requests — plus the add action.
 */
export function ChildSwitcher() {
  const { t } = useLayoutTranslation("app");
  const { children, pendingRequests, child, select } = useSelectedChild();
  const [open, setOpen] = useState(false);

  if (!child && pendingRequests.length === 0) {
    return null;
  }

  const ringFor = (index: number) =>
    RING_COLORS[index % RING_COLORS.length] ?? RING_COLORS[0];
  const selectedIndex = child
    ? children.findIndex((kid) => kid.id === child.id)
    : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-muted"
        >
          {child ? (
            <ChildAvatar
              mediaAssetId={child.photoMediaAssetId}
              photoUrl={child.photoUrl}
              name={child.name}
              className="h-8 w-8 text-sm"
              ringClassName={ringFor(selectedIndex)}
            />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sunshine text-sunshine-ink ring-2 ring-sunshine ring-offset-2 ring-offset-card">
              <Clock className="h-4 w-4" />
            </span>
          )}
          <div className="hidden min-w-0 text-left sm:block">
            <p className="flex items-center gap-1 text-sm font-bold">
              <span className="truncate">
                {child?.name ?? pendingRequests[0]?.childName ?? ""}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {child
                ? [child.centerName, child.className]
                    .filter(Boolean)
                    .join(" · ")
                : t("childSwitcher.pending")}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:hidden" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 rounded-2xl p-2">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("childSwitcher.title")}
        </p>
        {children.map((kid, index) => (
          <button
            key={kid.id}
            type="button"
            onClick={() => {
              select(kid.id);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted"
          >
            <ChildAvatar
              mediaAssetId={kid.photoMediaAssetId}
              photoUrl={kid.photoUrl}
              name={kid.name}
              className="h-9 w-9 text-sm"
              ringClassName={ringFor(index)}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{kid.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[kid.centerName, kid.className].filter(Boolean).join(" · ")}
              </p>
            </div>
            {kid.id === child?.id ? (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            ) : null}
          </button>
        ))}
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 opacity-90"
          >
            <ChildAvatar
              mediaAssetId={null}
              photoUrl={request.childPhotoUrl}
              name={request.childName ?? "?"}
              className="h-9 w-9 text-sm"
              ringClassName="ring-border"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{request.childName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {request.centerName}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sunshine px-2 py-0.5 text-[10px] font-bold text-sunshine-ink">
              <Clock className="h-3 w-3" />
              {t("childSwitcher.pending")}
            </span>
          </div>
        ))}
        <Separator className="my-1.5" />
        <Link
          href="/dashboard/children/new"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-bold text-primary transition-colors hover:bg-muted"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-dashed border-primary/50">
            <Plus className="h-4 w-4" />
          </span>
          {t("childSwitcher.addChild")}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
