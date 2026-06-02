"use client";

import { useState } from "react";
import { Flag, LogOut, Move, PlusCircle, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EXIT_REASONS,
  EXIT_REASON_LABEL,
  type ActiveTrade,
  type ActiveTradeExitOutcome,
  type ExitReason,
} from "@/types";
import { cn } from "@/lib/utils";

// Unified modal for the four Active Trade Monitoring workflows. The page
// passes a discriminated `mode` and the trade — this component owns its
// local form state and emits a typed `{ action: ..., payload }` to the
// page on submit. The page maps it to the right slice action.

export type ActiveTradeActionMode =
  | "move_stop"
  | "add_position"
  | "mark_mistake"
  | "log_exit";

export type ActiveTradeActionSubmit =
  | { mode: "move_stop"; newStopPrice: number }
  | {
      mode: "add_position";
      additionalSize: number;
      addedAtPrice: number;
    }
  | { mode: "mark_mistake"; note: string }
  | {
      mode: "log_exit";
      exitPrice: number;
      outcome: ActiveTradeExitOutcome;
      reflection: string;
      exitReason: ExitReason;
      exitNotes: string;
    };

type Props = {
  open: boolean;
  mode: ActiveTradeActionMode | null;
  trade: ActiveTrade;
  onClose: () => void;
  onSubmit: (payload: ActiveTradeActionSubmit) => void;
};

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function ActiveTradeActionModal({
  open,
  mode,
  trade,
  onClose,
  onSubmit,
}: Props) {
  if (!mode) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="dark flex max-w-lg flex-col gap-5 border border-white/15 bg-card/95 p-5 text-foreground sm:max-w-lg"
      >
        <ModalHeader mode={mode} onClose={onClose} />
        <ModalBody
          mode={mode}
          trade={trade}
          onSubmit={(payload) => {
            onSubmit(payload);
            onClose();
          }}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

function ModalHeader({
  mode,
  onClose,
}: {
  mode: ActiveTradeActionMode;
  onClose: () => void;
}) {
  const meta: Record<
    ActiveTradeActionMode,
    {
      title: string;
      description: string;
      icon: typeof Move;
      tone: string;
    }
  > = {
    move_stop: {
      title: "Move Stop",
      description:
        "Enter the new stop price. StandFast will compare it to your original plan and log any deviation.",
      icon: Move,
      tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    },
    add_position: {
      title: "Add to Position",
      description:
        "Enter the additional size and the price you added at. We'll recalculate total risk, exposure, and reward:risk.",
      icon: PlusCircle,
      tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    },
    mark_mistake: {
      title: "Mark as Mistake",
      description:
        "Flag this trade for review. Your note is preserved on the trade and on the behavior feed.",
      icon: Flag,
      tone: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
    },
    log_exit: {
      title: "Log Exit",
      description:
        "Record the exit price and outcome. The active trade is archived and an exit event is appended.",
      icon: LogOut,
      tone: "bg-brand/15 text-brand ring-brand/30",
    },
  };
  const m = meta[mode];
  const Icon = m.icon;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
            m.tone,
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-base font-semibold text-foreground">
            {m.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {m.description}
          </DialogDescription>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function ModalBody({
  mode,
  trade,
  onSubmit,
  onClose,
}: {
  mode: ActiveTradeActionMode;
  trade: ActiveTrade;
  onSubmit: (payload: ActiveTradeActionSubmit) => void;
  onClose: () => void;
}) {
  if (mode === "move_stop") {
    return (
      <MoveStopBody trade={trade} onSubmit={onSubmit} onClose={onClose} />
    );
  }
  if (mode === "add_position") {
    return (
      <AddPositionBody trade={trade} onSubmit={onSubmit} onClose={onClose} />
    );
  }
  if (mode === "mark_mistake") {
    return <MarkMistakeBody onSubmit={onSubmit} onClose={onClose} />;
  }
  return <LogExitBody trade={trade} onSubmit={onSubmit} onClose={onClose} />;
}

// ---------------------------------------------------------------------------
// Per-mode bodies
// ---------------------------------------------------------------------------

function MoveStopBody({
  trade,
  onSubmit,
  onClose,
}: {
  trade: ActiveTrade;
  onSubmit: (payload: ActiveTradeActionSubmit) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const parsed = parseNumber(value);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed == null) return;
        onSubmit({ mode: "move_stop", newStopPrice: parsed });
      }}
    >
      <Comparison
        baselineLabel="Original Stop"
        baseline={trade.stopPrice}
        currentLabel="Current Stop"
        current={trade.currentStopPrice}
      />
      <div className="flex flex-col gap-1.5">
        <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          New Stop Price
        </Label>
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.00"
          autoFocus
        />
      </div>
      <Footer
        confirmLabel="Update Stop"
        disabled={parsed == null}
        onClose={onClose}
      />
    </form>
  );
}

function AddPositionBody({
  trade,
  onSubmit,
  onClose,
}: {
  trade: ActiveTrade;
  onSubmit: (payload: ActiveTradeActionSubmit) => void;
  onClose: () => void;
}) {
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const sizeNum = parseNumber(size);
  const priceNum = parseNumber(price);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (sizeNum == null || priceNum == null) return;
        onSubmit({
          mode: "add_position",
          additionalSize: sizeNum,
          addedAtPrice: priceNum,
        });
      }}
    >
      <Comparison
        baselineLabel="Original Size"
        baseline={trade.positionSize}
        currentLabel="Current Size"
        current={trade.currentPositionSize}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Additional Shares / Contracts
          </Label>
          <Input
            inputMode="decimal"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Added At Price
          </Label>
          <Input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <Footer
        confirmLabel="Log Add"
        disabled={sizeNum == null || priceNum == null}
        onClose={onClose}
      />
    </form>
  );
}

function MarkMistakeBody({
  onSubmit,
  onClose,
}: {
  onSubmit: (payload: ActiveTradeActionSubmit) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ mode: "mark_mistake", note });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Reflection (optional)
        </Label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="What went wrong here? Setup wasn't valid? Emotional decision? Wrong size?"
          className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          autoFocus
        />
      </div>
      <Footer
        confirmLabel="Log Mistake"
        confirmTone="rose"
        disabled={false}
        onClose={onClose}
      />
    </form>
  );
}

// Default exit reason per outcome. Pre-selects the reason that matches
// the trader's outcome pick, so a clean win/loss flow needs zero extra
// clicks. Manual exits (risk reduction, profit protection, etc.) require
// the trader to deliberately reselect — that's the point.
const DEFAULT_REASON_BY_OUTCOME: Record<ActiveTradeExitOutcome, ExitReason> = {
  win: "target_hit",
  loss: "stop_loss_hit",
  breakeven: "other",
};

function LogExitBody({
  trade,
  onSubmit,
  onClose,
}: {
  trade: ActiveTrade;
  onSubmit: (payload: ActiveTradeActionSubmit) => void;
  onClose: () => void;
}) {
  const [price, setPrice] = useState("");
  const [outcome, setOutcome] = useState<ActiveTradeExitOutcome>("win");
  const [reflection, setReflection] = useState("");
  const [exitReason, setExitReason] = useState<ExitReason>(
    DEFAULT_REASON_BY_OUTCOME.win,
  );
  const [exitNotes, setExitNotes] = useState("");
  const priceNum = parseNumber(price);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (priceNum == null) return;
        onSubmit({
          mode: "log_exit",
          exitPrice: priceNum,
          outcome,
          reflection,
          exitReason,
          exitNotes,
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Exit Price (entry was {trade.entryPrice})
        </Label>
        <Input
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Outcome
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {(["win", "loss", "breakeven"] as const).map((o) => {
            const active = outcome === o;
            const activeClass =
              o === "win"
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : o === "loss"
                  ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                  : "border-amber-500/50 bg-amber-500/15 text-amber-300";
            return (
              <button
                key={o}
                type="button"
                onClick={() => {
                  setOutcome(o);
                  // Auto-suggest the matching exit reason — trader can
                  // override. Only nudges when the current pick still
                  // matches the OLD default (i.e., they haven't already
                  // chosen a manual exit reason on purpose).
                  setExitReason((prev) =>
                    prev === DEFAULT_REASON_BY_OUTCOME[outcome]
                      ? DEFAULT_REASON_BY_OUTCOME[o]
                      : prev,
                  );
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-semibold capitalize transition-colors",
                  active
                    ? activeClass
                    : "border-input bg-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {o}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Exit Reason
        </Label>
        <select
          value={exitReason}
          onChange={(e) => setExitReason(e.target.value as ExitReason)}
          className="rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {EXIT_REASONS.map((r) => (
            <option key={r} value={r} className="bg-card text-foreground">
              {EXIT_REASON_LABEL[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Exit Notes (optional)
        </Label>
        <textarea
          value={exitNotes}
          onChange={(e) => setExitNotes(e.target.value)}
          rows={2}
          placeholder='e.g. "Cut loss early when price failed to reclaim VWAP."'
          className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          What happened during this trade? (optional)
        </Label>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={3}
          placeholder="What went right or wrong? What would you do differently?"
          className="w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>
      <Footer
        confirmLabel="Log Exit"
        disabled={priceNum == null}
        onClose={onClose}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

function Comparison({
  baselineLabel,
  baseline,
  currentLabel,
  current,
}: {
  baselineLabel: string;
  // Nullable so a Move Stop modal opens cleanly on a trade whose original
  // stop was missing (override activation). Renders "—" when null.
  baseline: number | null;
  currentLabel: string;
  current: number | null;
}) {
  const fmt = (v: number | null) => (v == null ? "—" : String(v));
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-background/30 p-3">
      <div className="flex flex-col gap-0.5 leading-tight">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {baselineLabel}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {fmt(baseline)}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 leading-tight">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {currentLabel}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {fmt(current)}
        </span>
      </div>
    </div>
  );
}

function Footer({
  confirmLabel,
  confirmTone = "brand",
  disabled,
  onClose,
}: {
  confirmLabel: string;
  confirmTone?: "brand" | "rose";
  disabled: boolean;
  onClose: () => void;
}) {
  const tone =
    confirmTone === "rose"
      ? "bg-rose-500 text-rose-950 hover:bg-rose-500/90"
      : "bg-brand text-brand-foreground hover:bg-brand/90";
  return (
    <div className="-mx-5 -mb-5 flex items-center justify-end gap-2 rounded-b-xl border-t border-white/10 bg-background/30 px-4 py-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={disabled}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          tone,
        )}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
