"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { useTimeframe } from "@/lib/analytics/timeframe";
import {
  buildDeteriorationSeries,
  buildDisciplineSeries,
  buildInterventionFrequencySeries,
  buildReentrySeries,
  buildRiskEscalationSeries,
  buildStateHistory,
  buildStopWideningSeries,
  buildWarningOverrideSeries,
  type TrendSeries,
} from "@/lib/analytics/trend-series";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { cn } from "@/lib/utils";

import { StateHeatmap } from "@/features/analytics/components/charts/state-heatmap";
import { TrendLineChart } from "@/features/analytics/components/charts/trend-line-chart";

// SECTION 2 — Behavioral Trend Charts
//
// Grid of behavioral series. Discipline-first, P/L absent — this page is
// behaviorally focused by design.

type TrendCardProps = {
  series: TrendSeries;
  tone: "brand" | "emerald" | "amber" | "rose";
  // Discipline = higher is better. Most others = higher is worse.
  higherIsBetter?: boolean;
  yMin?: number;
  yMax?: number;
};

const TREND_LABEL: Record<TrendSeries["direction"], string> = {
  improving: "Trending better",
  declining: "Trending worse",
  stable: "Steady",
  insufficient: "Insufficient sample",
};

function TrendDirection({
  direction,
  higherIsBetter = false,
}: {
  direction: TrendSeries["direction"];
  higherIsBetter?: boolean;
}) {
  // The series direction is computed against value (default = higher
  // is worse). For higher-is-better series (discipline), the series'
  // direction is already inverted by the builder. We just style.
  const Icon =
    direction === "improving"
      ? ArrowUpRight
      : direction === "declining"
        ? ArrowDownRight
        : Minus;
  const tone =
    direction === "improving"
      ? "text-emerald-300"
      : direction === "declining"
        ? "text-rose-300"
        : "text-muted-foreground";
  // Suppress the "higherIsBetter" reminder lint — the builder
  // pre-inverts for discipline. The flag stays in case a future series
  // wants to opt-out.
  void higherIsBetter;
  return (
    <span className={cn("flex items-center gap-1 text-[0.7rem]", tone)}>
      <Icon className="size-3.5" />
      {TREND_LABEL[direction]}
    </span>
  );
}

function TrendCard({
  series,
  tone,
  higherIsBetter = false,
  yMin,
  yMax,
}: TrendCardProps) {
  const last = series.points[series.points.length - 1]?.value ?? 0;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 leading-tight">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            {series.label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {Number.isInteger(last) ? last : last.toFixed(1)}
            </span>
            <span className="text-[0.65rem] text-muted-foreground">
              latest · median {series.median.toFixed(0)}
            </span>
          </div>
        </div>
        <TrendDirection
          direction={series.direction}
          higherIsBetter={higherIsBetter}
        />
      </div>
      <TrendLineChart
        points={series.points.map((p) => ({
          label: p.tradingDate,
          value: p.value,
        }))}
        tone={tone}
        yMin={yMin}
        yMax={yMax}
      />
    </div>
  );
}

export function BehavioralTrendCharts() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();

  const series = useMemo(
    () => ({
      discipline: buildDisciplineSeries(inputs, timeframe, nowMs),
      overrides: buildWarningOverrideSeries(inputs, timeframe, nowMs),
      stopWidening: buildStopWideningSeries(inputs, timeframe, nowMs),
      reentry: buildReentrySeries(inputs, timeframe, nowMs),
      riskEscalation: buildRiskEscalationSeries(inputs, timeframe, nowMs),
      interventionFreq: buildInterventionFrequencySeries(
        inputs,
        timeframe,
        nowMs,
      ),
      deterioration: buildDeteriorationSeries(inputs, timeframe, nowMs),
    }),
    [inputs, timeframe, nowMs],
  );

  const stateHistory = useMemo(
    () => buildStateHistory(inputs, timeframe, nowMs),
    [inputs, timeframe, nowMs],
  );

  return (
    <section
      aria-label="Behavioral trend charts"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Behavioral Trends
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <TrendCard
          series={series.discipline}
          tone="emerald"
          higherIsBetter
          yMin={0}
          yMax={100}
        />
        <TrendCard series={series.overrides} tone="rose" />
        <TrendCard series={series.stopWidening} tone="rose" />
        <TrendCard series={series.reentry} tone="amber" />
        <TrendCard series={series.riskEscalation} tone="rose" />
        <TrendCard series={series.interventionFreq} tone="brand" />
        <TrendCard series={series.deterioration} tone="rose" />
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 p-4 backdrop-blur lg:col-span-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 leading-tight">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Session state history
              </span>
              <span className="text-[0.65rem] text-muted-foreground">
                One square per session · peak state across the window
              </span>
            </div>
          </div>
          <StateHeatmap points={stateHistory} />
        </div>
      </div>
    </section>
  );
}
