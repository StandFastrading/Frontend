"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

import type { ActiveTradeApprovalStatus } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  onCheckTrade: () => void;
  onClearForm: () => void;
  onSaveDraft: () => void;
  // Manual broker bridge: surfaced only when the latest check produced an
  // activatable snapshot. The page passes the bool + the approval pathway
  // so the CTA can tint itself (green for clean approval, amber when the
  // trader continued through warnings).
  canMarkActive: boolean;
  approvalStatus: ActiveTradeApprovalStatus | null;
  onMarkTradeAsActive: () => void;
};

export function ActionButtons({
  onCheckTrade,
  onClearForm,
  onSaveDraft,
  canMarkActive,
  approvalStatus,
  onMarkTradeAsActive,
}: Props) {
  const isWarningOverride = approvalStatus === "approved_with_warnings";
  const markActiveTone = isWarningOverride
    ? "bg-amber-500 text-amber-950 hover:bg-amber-500/90"
    : "bg-emerald-500 text-emerald-950 hover:bg-emerald-500/90";
  const MarkIcon = isWarningOverride ? AlertTriangle : CheckCircle2;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/15 bg-card/60 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCheckTrade}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
        >
          <ShieldCheck className="size-4" />
          Check Trade
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          className="flex items-center gap-2 rounded-lg border border-white/15 bg-background/40 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
        >
          <Save className="size-4" />
          Save as Draft
        </button>
        <button
          type="button"
          onClick={onClearForm}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-4" />
          Clear Form
        </button>
      </div>

      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        {canMarkActive ? (
          // Conditional CTA — renders for both clean approvals and warning
          // overrides. Amber when the approval came through Continue Anyway
          // so the trader sees the override pathway distinctly from a
          // clean approval.
          <div className="flex flex-col items-end gap-0.5">
            <button
              type="button"
              onClick={onMarkTradeAsActive}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                markActiveTone,
              )}
            >
              <MarkIcon className="size-4" />
              Mark Trade as Active
            </button>
            {isWarningOverride ? (
              <span className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-amber-300">
                Trade activated with acknowledged warnings
              </span>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          disabled
          className={cn(
            "flex items-center gap-2 rounded-lg border border-dashed border-white/15 bg-background/30 px-4 py-2 text-sm font-semibold text-muted-foreground",
            "cursor-not-allowed",
          )}
          title="StandFast does not execute trades — broker integration coming later"
        >
          <Lock className="size-4" />
          Execute Trade • Broker Execution Coming Later
        </button>
      </div>
    </div>
  );
}
