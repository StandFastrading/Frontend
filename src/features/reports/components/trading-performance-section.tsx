"use client";

import { TrendingUp } from "lucide-react";

import {
  MetricCell,
  SectionShell,
} from "@/features/reports/components/section-shell";
import type { TradingPerformance } from "@/features/reports/reports-engine";

// SECTION 1 — Trading Performance.
//
// Single compact card row. Mirrors Trade History summary density. No
// charts — every number is a decision input on its own.

export function TradingPerformanceSection({
  data,
}: {
  data: TradingPerformance;
}) {
  const pnlTone =
    data.netPnL > 0 ? "emerald" : data.netPnL < 0 ? "rose" : "muted";
  const winnerTone =
    data.averageWinner > 0 ? "emerald" : ("muted" as const);
  const loserTone = data.averageLoser < 0 ? "rose" : ("muted" as const);
  const winRateTone = data.winRate >= 50 ? "emerald" : "muted";
  const profitFactorTone =
    data.profitFactor == null
      ? "muted"
      : data.profitFactor >= 1.5
        ? "emerald"
        : data.profitFactor >= 1
          ? "amber"
          : "rose";

  return (
    <SectionShell
      icon={TrendingUp}
      eyebrow="Section 1"
      title="Trading Performance"
      description="Headline P/L, win rate, and risk-adjusted reads from closed trades in the window."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <MetricCell
          label="Net P/L"
          value={data.netPnLLabel}
          tone={pnlTone}
        />
        <MetricCell
          label="Win Rate"
          value={`${data.winRate.toFixed(1)}%`}
          secondary={`${data.winCount}W · ${data.lossCount}L · ${data.breakevenCount}BE`}
          tone={winRateTone}
        />
        <MetricCell label="Avg R" value={data.averageRLabel} />
        <MetricCell
          label="Avg Winner"
          value={data.averageWinnerLabel}
          tone={winnerTone}
        />
        <MetricCell
          label="Avg Loser"
          value={data.averageLoserLabel}
          tone={loserTone}
        />
        <MetricCell
          label="Profit Factor"
          value={data.profitFactorLabel}
          tone={profitFactorTone}
        />
        <MetricCell label="Total Trades" value={String(data.totalTrades)} />
      </div>
    </SectionShell>
  );
}
