"use client";

import { Lock, RotateCcw, Save, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  onCheckTrade: () => void;
  onClearForm: () => void;
  onSaveDraft: () => void;
};

export function ActionButtons({ onCheckTrade, onClearForm, onSaveDraft }: Props) {
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

      <button
        type="button"
        disabled
        className={cn(
          "flex items-center gap-2 rounded-lg border border-dashed border-white/15 bg-background/30 px-4 py-2 text-sm font-semibold text-muted-foreground",
          "cursor-not-allowed",
        )}
        title="Execute Trade is disabled until broker integration is connected"
      >
        <Lock className="size-4" />
        Execute Trade • Coming Later
      </button>
    </div>
  );
}
