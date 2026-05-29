"use client";

import { useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";

import {
  Dialog,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { TradeDetailView } from "@/features/journal/components/trade-detail-view";
import {
  BEHAVIOR_TAG_LABEL,
  BEHAVIOR_TAG_TONE,
  type BehaviorTag,
  type TradeHistoryRow,
} from "@/features/trades/trade-history-engine";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

import {
  CALENDAR_SESSION_STATE_LABEL,
  formatLongDate,
  type DailyCalendarSummary,
} from "@/features/calendar/calendar-engine";

// Day Detail modal — opens on calendar cell click. Lists the day's
// trades; clicking a row hands off to the existing TradeDetailView.
// Behavior summary at the bottom is small and informational only —
// Calendar stays P/L-first.

const SESSION_STATE_TONE: Record<string, string> = {
  focused: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  controlled: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  escalating: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
};

const TAG_TONE: Record<"emerald" | "amber" | "rose" | "muted", string> = {
  emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  rose: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  muted: "bg-foreground/[0.05] text-muted-foreground ring-white/10",
};

const OUTCOME_TONE = {
  win: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30",
  loss: "text-rose-300 bg-rose-500/10 ring-rose-500/30",
  breakeven: "text-muted-foreground bg-foreground/[0.05] ring-white/10",
} as const;

const OUTCOME_LABEL = {
  win: "Win",
  loss: "Loss",
  breakeven: "BE",
} as const;

export function DayDetailModal({
  day,
  rowsForDay,
  open,
  onOpenChange,
}: {
  day: DailyCalendarSummary | null;
  rowsForDay: TradeHistoryRow[];
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const closedTrades = useAppStore((s) => s.closedTrades);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);

  const selectedTrade = useMemo(
    () =>
      selectedTradeId
        ? (closedTrades.find((t) => t.id === selectedTradeId) ?? null)
        : null,
    [closedTrades, selectedTradeId],
  );

  if (!day) return null;

  const pnlTone =
    day.dailyNetPnL > 0
      ? "text-emerald-300"
      : day.dailyNetPnL < 0
        ? "text-rose-300"
        : "text-foreground";
  const bestTrade =
    day.bestTradeId != null
      ? rowsForDay.find((r) => r.id === day.bestTradeId)
      : undefined;
  const worstTrade =
    day.worstTradeId != null
      ? rowsForDay.find((r) => r.id === day.worstTradeId)
      : undefined;
  const tagCounts = countTagsOnDay(rowsForDay);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className="fixed top-1/2 left-1/2 z-50 grid max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr] gap-4 overflow-hidden rounded-xl bg-popover p-5 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <DialogPrimitive.Title className="text-base font-semibold leading-tight text-foreground">
                  {formatLongDate(day.date)}
                </DialogPrimitive.Title>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className={cn("text-xl font-semibold tabular-nums", pnlTone)}>
                    {day.dailyNetPnLLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {day.totalTrades} trade{day.totalTrades === 1 ? "" : "s"}
                  </span>
                  {day.sessionState ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
                        SESSION_STATE_TONE[day.sessionState],
                      )}
                    >
                      {CALENDAR_SESSION_STATE_LABEL[day.sessionState]}
                    </span>
                  ) : null}
                </div>
              </div>
              <DialogPrimitive.Close
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                aria-label="Close day detail"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
              {/* Day rollup grid */}
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-background/30 p-3 sm:grid-cols-5">
                <Metric label="Win Rate" value={`${day.winRate.toFixed(1)}%`} />
                <Metric label="Avg R" value={day.averageRLabel} />
                <Metric
                  label="Best Trade"
                  value={bestTrade ? bestTrade.pnlLabel : "—"}
                  secondary={bestTrade?.symbol}
                  tone={bestTrade && bestTrade.realizedPnL > 0 ? "emerald" : "muted"}
                />
                <Metric
                  label="Worst Trade"
                  value={worstTrade ? worstTrade.pnlLabel : "—"}
                  secondary={worstTrade?.symbol}
                  tone={worstTrade && worstTrade.realizedPnL < 0 ? "rose" : "muted"}
                />
                <Metric
                  label="Rule Breaks"
                  value={String(day.ruleBreakCount)}
                  tone={day.ruleBreakCount > 0 ? "amber" : "muted"}
                />
              </div>

              {/* Trade list */}
              <ul className="flex flex-col gap-1.5">
                {rowsForDay.map((row) => (
                  <li key={row.id}>
                    <TradeRow
                      row={row}
                      onOpen={() => setSelectedTradeId(row.id)}
                    />
                  </li>
                ))}
              </ul>

              {/* Behavior summary */}
              <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-background/30 p-3">
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                  Behavior Summary
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <BehaviorChip
                    label="Clean trades"
                    value={tagCounts.clean}
                    tone="emerald"
                  />
                  <BehaviorChip
                    label="Stop widened"
                    value={tagCounts.stop_widened}
                    tone={tagCounts.stop_widened > 0 ? "amber" : "muted"}
                  />
                  <BehaviorChip
                    label="Warning ignored"
                    value={
                      tagCounts.warning_ignored + tagCounts.override_accepted
                    }
                    tone={
                      tagCounts.warning_ignored + tagCounts.override_accepted >
                      0
                        ? "rose"
                        : "muted"
                    }
                  />
                  <BehaviorChip
                    label="Mistake marked"
                    value={tagCounts.mistake_marked}
                    tone={tagCounts.mistake_marked > 0 ? "rose" : "muted"}
                  />
                </div>
              </div>
            </div>
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>

      <TradeDetailView
        trade={selectedTrade}
        open={selectedTrade != null}
        onOpenChange={(next) => {
          if (!next) setSelectedTradeId(null);
        }}
      />
    </>
  );
}

function TradeRow({
  row,
  onOpen,
}: {
  row: TradeHistoryRow;
  onOpen: () => void;
}) {
  const pnlTone =
    row.realizedPnL > 0
      ? "text-emerald-300"
      : row.realizedPnL < 0
        ? "text-rose-300"
        : "text-foreground";
  const displayTags = row.tags.filter(
    (t) => t !== "reflection_missing" && t !== "clean",
  );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-background/30 px-3 py-2 text-left transition-colors hover:border-white/20 hover:bg-foreground/[0.04] focus-visible:border-brand/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30"
      aria-label={`Open trade detail for ${row.symbol}`}
    >
      <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-foreground">
            {row.symbol}
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            {row.direction}
            {row.setupType ? ` · ${row.setupType}` : ""}
          </span>
        </div>
        <span className="truncate text-[0.6rem] text-muted-foreground">
          {row.entryPrice.toFixed(2)} → {row.exitPrice.toFixed(2)} ·{" "}
          {row.positionSize.toLocaleString()} sh
        </span>
      </div>
      <div className="flex flex-col gap-0.5 leading-tight tabular-nums">
        <span className={cn("text-sm font-semibold", pnlTone)}>
          {row.pnlLabel}
        </span>
        <span className="text-[0.6rem] text-muted-foreground">
          {row.rLabel}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] ring-1",
            OUTCOME_TONE[row.outcome],
          )}
        >
          {OUTCOME_LABEL[row.outcome]}
        </span>
        {displayTags.length > 0 ? (
          <span
            className={cn(
              "hidden rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] ring-1 sm:inline-flex",
              TAG_TONE[BEHAVIOR_TAG_TONE[displayTags[0]]],
            )}
            title={displayTags.map((t) => BEHAVIOR_TAG_LABEL[t]).join(" · ")}
          >
            {BEHAVIOR_TAG_LABEL[displayTags[0]]}
            {displayTags.length > 1 ? ` +${displayTags.length - 1}` : ""}
          </span>
        ) : null}
      </div>
      <ArrowRight className="size-3.5 text-muted-foreground/60" />
    </button>
  );
}

function Metric({
  label,
  value,
  secondary,
  tone,
}: {
  label: string;
  value: string;
  secondary?: string;
  tone?: "emerald" | "rose" | "amber" | "muted";
}) {
  const cls =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
        ? "text-rose-300"
        : tone === "amber"
          ? "text-amber-300"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
        {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", cls)}>
        {value}
      </span>
      {secondary ? (
        <span className="text-[0.6rem] text-muted-foreground">{secondary}</span>
      ) : null}
    </div>
  );
}

function BehaviorChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "amber" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] ring-1",
        TAG_TONE[tone],
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

function countTagsOnDay(
  rows: TradeHistoryRow[],
): Record<BehaviorTag, number> {
  const counts: Record<BehaviorTag, number> = {
    clean: 0,
    stop_widened: 0,
    warning_ignored: 0,
    override_accepted: 0,
    size_escalation: 0,
    rapid_reentry: 0,
    mistake_marked: 0,
    reflection_missing: 0,
  };
  for (const row of rows) {
    for (const tag of row.tags) {
      counts[tag] += 1;
    }
  }
  return counts;
}
