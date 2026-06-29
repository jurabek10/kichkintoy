"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLayoutTranslation } from "@/i18n/useLayoutTranslation";

/**
 * The web counterpart to the mobile finger-signature: a parent draws on a sheet
 * of "paper" to authorize medicine for their child. We render to a real canvas
 * with Pointer Events (mouse, trackpad, pen, touch all land in the same path),
 * keep an internal backing store sized to the device pixel ratio so the ink
 * stays crisp, and hand back a PNG `File` so it slots straight into the same
 * media-upload flow the composer already uses for the medicine photo.
 */
export function SignaturePad({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (file: File) => void;
}) {
  const { t } = useLayoutTranslation("medications");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // Size the backing store to the painted box × DPR once the dialog is on
  // screen (the canvas has no layout size until then), and paint the baseline.
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#2B2D31";
      setHasInk(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    last.current = pointFromEvent(event);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const from = last.current;
    if (!ctx || !from) return;
    const to = pointFromEvent(event);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    last.current = to;
    if (!hasInk) setHasInk(true);
  }

  function end() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onSave(new File([blob], "signature.png", { type: "image/png" }));
      onOpenChange(false);
    }, "image/png");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-4">
        <DialogHeader>
          <DialogTitle>{t("signature.title")}</DialogTitle>
          <DialogDescription>{t("signature.drawHint")}</DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-2xl border bg-white">
          {/* A baseline rule with an ✕ cue, the way a paper form marks the line
              to sign on — it reads as a place to sign, not a blank box. */}
          <div className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-muted-foreground/40" />
          <span className="pointer-events-none absolute bottom-[34px] left-6 text-muted-foreground/50">
            ✕
          </span>
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            onPointerCancel={end}
            className="h-56 w-full touch-none"
          />
          {!hasInk ? (
            <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground/60">
              <PenLine className="h-6 w-6" />
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={clear} disabled={!hasInk}>
            <Eraser className="h-4 w-4" />
            {t("signature.clear")}
          </Button>
          <Button type="button" onClick={save} disabled={!hasInk}>
            {t("signature.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
