"use client";

import { AlertTriangle, RotateCcw, ShieldOff, XCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RuleCheckResult } from "@/features/desk/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: RuleCheckResult[];
  onContinueAnyway: () => void;
  onReviseTrade: () => void;
  onCancelTrade: () => void;
};

export function RuleCheckModal({
  open,
  onOpenChange,
  results,
  onContinueAnyway,
  onReviseTrade,
  onCancelTrade,
}: Props) {
  const failures = results.filter((r) => r.status === "fail");
  const warnings = results.filter((r) => r.status === "warning");
  const hasFail = failures.length > 0;
  const primary = failures[0] ?? warnings[0];
  const issues = [...failures, ...warnings];

  if (!primary) return null;

  const title = hasFail ? "Trade blocks rule check" : "Trade triggers a warning";
  const summary = hasFail
    ? `${failures.length} rule${failures.length === 1 ? "" : "s"} failed${warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : ""}.`
    : `${warnings.length} warning${warnings.length === 1 ? "" : "s"}.`;

  return (
    <Dialog
      open={open}
      // Required-action modal: only the three buttons below can dismiss it.
      // We ignore base-ui's close events (outside click, escape, X). Programmatic
      // closes from action handlers set parent state directly, which still
      // closes the modal via the controlled `open` prop.
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
      }}
      disablePointerDismissal
    >
      <DialogContent
        showCloseButton={false}
        className="dark flex max-w-lg flex-col gap-5 border border-white/15 bg-card/95 p-5 text-foreground sm:max-w-lg"
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
              hasFail
                ? "bg-rose-500/15 text-rose-400 ring-rose-500/30"
                : "bg-amber-500/15 text-amber-400 ring-amber-500/30",
            )}
          >
            {hasFail ? (
              <ShieldOff className="size-5" />
            ) : (
              <AlertTriangle className="size-5" />
            )}
          </span>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-base font-semibold text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {summary}
            </DialogDescription>
          </div>
        </div>

        <ul className="flex flex-col gap-2">
          {issues.map((r) => {
            const isFail = r.status === "fail";
            return (
              <li
                key={r.id}
                className={cn(
                  "flex gap-3 rounded-lg border px-3 py-2.5",
                  isFail
                    ? "border-rose-500/30 bg-rose-500/[0.06]"
                    : "border-amber-500/30 bg-amber-500/[0.06]",
                )}
              >
                {isFail ? (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                )}
                <div className="flex flex-1 flex-col gap-1 leading-tight">
                  <span className="text-sm font-semibold text-foreground">
                    {r.label}
                  </span>
                  {r.message ? (
                    <span className="text-xs text-muted-foreground">
                      {r.message}
                    </span>
                  ) : null}
                  {r.recommendedAction ? (
                    <span className="text-xs text-foreground/80">
                      <span className="font-semibold uppercase tracking-[0.14em] text-[0.6rem] text-muted-foreground">
                        Recommended ·{" "}
                      </span>
                      {r.recommendedAction}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="-mx-5 -mb-5 flex flex-col gap-2 rounded-b-xl border-t border-white/10 bg-background/30 p-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancelTrade}
            className="flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/15"
          >
            <XCircle className="size-4" />
            Cancel Trade
          </button>
          <button
            type="button"
            onClick={onReviseTrade}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-background/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
          >
            <RotateCcw className="size-4" />
            Revise Trade
          </button>
          <button
            type="button"
            onClick={onContinueAnyway}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
              hasFail
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                : "border-brand/40 bg-brand/10 text-brand hover:bg-brand/15",
            )}
          >
            Continue Anyway
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
