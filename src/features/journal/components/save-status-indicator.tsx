"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, PencilLine } from "lucide-react";

import type { AutoSaveStatus } from "@/lib/journal/use-auto-save";
import { cn } from "@/lib/utils";

// Subtle save-status pill. Lives next to the section header so the
// trader can glance at it without it competing with the writing. Tone
// is intentionally muted — premium, not loud.

const STATUS_LABEL: Record<AutoSaveStatus, string> = {
  idle: "Saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  saved: "Saved",
  failed: "Save failed",
};

const STATUS_TONE: Record<AutoSaveStatus, string> = {
  idle: "text-muted-foreground",
  unsaved: "text-amber-300/85",
  saving: "text-brand/90",
  saved: "text-emerald-300/90",
  failed: "text-rose-300",
};

function formatRelative(ts: number, nowMs: number): string {
  const delta = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)} min ago`;
  return `${Math.floor(delta / 3600)} h ago`;
}

export function SaveStatusIndicator({
  status,
  lastSavedAt,
  className,
}: {
  status: AutoSaveStatus;
  lastSavedAt: number | null;
  className?: string;
}) {
  // Lightweight ticker so the "Saved 12s ago" copy updates without
  // requiring a parent re-render. 15-second granularity is plenty for
  // a status label.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const Icon =
    status === "saving"
      ? Loader2
      : status === "unsaved"
        ? PencilLine
        : status === "failed"
          ? AlertCircle
          : Check;

  const showRelative =
    (status === "saved" || status === "idle") && lastSavedAt != null;

  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.16em]",
        STATUS_TONE[status],
        className,
      )}
    >
      <Icon
        className={cn("size-3.5", status === "saving" && "animate-spin")}
      />
      <span>
        {STATUS_LABEL[status]}
        {showRelative ? (
          <span className="ml-1 text-muted-foreground/70">
            · {formatRelative(lastSavedAt, nowMs)}
          </span>
        ) : null}
      </span>
    </span>
  );
}
