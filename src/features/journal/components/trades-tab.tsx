"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Flag, TriangleAlert } from "lucide-react";

import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import type { ClosedTrade } from "@/types";

import { TradeDetailView } from "@/features/journal/components/trade-detail-view";

// Trade Journal tab — chronological closed-trade history with behavior
// tags. The Journal section's "trades" view is read-only behavioral
// context (not the Trade History page itself); a future iteration can
// add per-trade notes inline. For V1, the focus is showing the
// behavioral metadata each trade carried at close — deviation count,
// mistake flag, override path — so the reflection workflow has the
// data to reason against.

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPnL(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatR(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}R`;
}

const OUTCOME_TONE = {
  win: "text-emerald-300",
  loss: "text-rose-300",
  breakeven: "text-muted-foreground",
} as const;

const OUTCOME_LABEL = {
  win: "Win",
  loss: "Loss",
  breakeven: "Breakeven",
} as const;

export function TradesTab() {
  const closedTrades = useAppStore((s) => s.closedTrades);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);

  // Sort newest first.
  const ordered = useMemo(
    () =>
      [...closedTrades].sort(
        (a, b) =>
          new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
      ),
    [closedTrades],
  );

  // Look up the selected trade from the ordered list — keeps the
  // detail view in sync if the underlying record changes (e.g., a
  // future iteration that allows trade edits from the dialog).
  const selectedTrade = useMemo(
    () =>
      selectedTradeId
        ? (ordered.find((t) => t.id === selectedTradeId) ?? null)
        : null,
    [ordered, selectedTradeId],
  );

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/10 bg-card/30 p-8 backdrop-blur">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Trade Journal
        </span>
        <p className="max-w-md text-sm text-muted-foreground">
          Closed trades will appear here with their behavioral metadata —
          deviations logged, mistakes flagged, override decisions, and
          realized R. No closed trades yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          {ordered.length} closed trade{ordered.length === 1 ? "" : "s"}
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground/60">
          Newest first
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {ordered.map((trade) => (
          <TradeRow
            key={trade.id}
            trade={trade}
            onOpen={() => setSelectedTradeId(trade.id)}
          />
        ))}
      </ul>

      <TradeDetailView
        trade={selectedTrade}
        open={selectedTrade != null}
        onOpenChange={(next) => {
          if (!next) setSelectedTradeId(null);
        }}
      />
    </div>
  );
}

function TradeRow({
  trade,
  onOpen,
}: {
  trade: ClosedTrade;
  onOpen: () => void;
}) {
  const outcomeTone = OUTCOME_TONE[trade.outcome];
  const outcomeLabel = OUTCOME_LABEL[trade.outcome];
  const hasMistake = trade.mistakeCount > 0;
  const hasDeviation = trade.deviationCount > 0;
  const isClean = !hasMistake && !hasDeviation;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-xl border border-white/10 bg-card/40 px-4 py-3 text-left backdrop-blur transition-colors hover:border-white/20 hover:bg-card/60 focus-visible:border-brand/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30"
        aria-label={`Open trade detail for ${trade.symbol}`}
      >
        <div className="flex flex-col gap-1 leading-tight">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">
            {trade.symbol}
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            {trade.direction} · {trade.marketType}
            {trade.setupType ? ` · ${trade.setupType}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[0.65rem] text-muted-foreground">
          <span>
            {formatDate(trade.closedAt)} · {formatTime(trade.closedAt)}
          </span>
          {isClean ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-emerald-300 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="size-3" />
              Clean
            </span>
          ) : (
            <>
              {hasDeviation ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-amber-300 ring-1 ring-amber-500/30">
                  <TriangleAlert className="size-3" />
                  {trade.deviationCount} deviation
                  {trade.deviationCount === 1 ? "" : "s"}
                </span>
              ) : null}
              {hasMistake ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-rose-300 ring-1 ring-rose-500/30">
                  <Flag className="size-3" />
                  Mistake flagged
                </span>
              ) : null}
            </>
          )}
          {trade.exitReflection ? (
            <span className="text-foreground/70">
              · &ldquo;{trade.exitReflection.slice(0, 70)}
              {trade.exitReflection.length > 70 ? "…" : ""}&rdquo;
            </span>
          ) : null}
        </div>
      </div>
        <span
          className={cn("text-sm font-semibold tabular-nums", outcomeTone)}
        >
          {outcomeLabel}
        </span>
        <div className="flex flex-col items-end leading-tight">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatR(trade.realizedR)}
          </span>
          <span className="text-[0.65rem] text-muted-foreground tabular-nums">
            {formatPnL(trade.realizedPnL)}
          </span>
        </div>
        {/* Affordance — chevron signals the row opens a detail view. */}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
      </button>
    </li>
  );
}
