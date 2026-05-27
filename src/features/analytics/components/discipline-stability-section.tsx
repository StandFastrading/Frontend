"use client";

import { useMemo } from "react";

import { computeDisciplineStability } from "@/lib/analytics/discipline-stability";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { cn } from "@/lib/utils";

// SECTION 5 — Discipline Stability Analysis
//
// Context-aware discipline metrics. Pressure-environment readings (under
// drawdown, after losses, during volatility) are weighted as the
// behaviorally meaningful signals; calm-session adherence is a baseline,
// not a flex.

type StabilityTileProps = {
  label: string;
  value: number | null;
  hint: string;
  sample: number;
  tone?: "default" | "pressure";
  suffix?: string;
};

function valueTone(value: number | null, isPressure: boolean): string {
  if (value == null) return "text-muted-foreground";
  if (value >= 80) return "text-emerald-300";
  if (value >= 60) return isPressure ? "text-emerald-300" : "text-foreground";
  if (value >= 40) return "text-amber-300";
  return "text-rose-300";
}

function StabilityTile({
  label,
  value,
  hint,
  sample,
  tone = "default",
  suffix = "/100",
}: StabilityTileProps) {
  const isPressure = tone === "pressure";
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-4 backdrop-blur",
        isPressure
          ? "border-amber-500/20 bg-amber-500/[0.03]"
          : "border-white/10 bg-card/40",
      )}
    >
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            valueTone(value, isPressure),
          )}
        >
          {value == null ? "—" : value}
        </span>
        {value != null ? (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
      <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
        <span>{hint}</span>
        <span className="tabular-nums">
          {sample} session{sample === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

export function DisciplineStabilitySection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  const stability = useMemo(
    () => computeDisciplineStability(inputs, timeframe, nowMs),
    [inputs, timeframe, nowMs],
  );

  return (
    <section
      aria-label="Discipline stability"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Discipline Stability
        </span>
        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/60">
          Pressure-weighted
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StabilityTile
          label="Rule adherence rate"
          value={stability.overallAdherenceRate}
          hint="Trades closed clean across window"
          sample={stability.sampleCounts.overall}
          suffix="%"
        />
        <StabilityTile
          label="Consistency"
          value={stability.consistencyScore}
          hint="Steadiness of discipline across sessions"
          sample={stability.sampleCounts.overall}
        />
        <StabilityTile
          label="Discipline after wins"
          value={stability.disciplineAfterWins}
          hint="Baseline behavior in calm sessions"
          sample={stability.sampleCounts.afterWins}
        />
        <StabilityTile
          label="Discipline under drawdown"
          value={stability.disciplineUnderDrawdown}
          hint="Sessions with ≥ 1 losing trade"
          sample={stability.sampleCounts.drawdown}
          tone="pressure"
        />
        <StabilityTile
          label="Discipline after losses"
          value={stability.disciplineAfterLosses}
          hint="Sessions with ≥ 2 consecutive losses"
          sample={stability.sampleCounts.afterLosses}
          tone="pressure"
        />
        <StabilityTile
          label="Discipline during volatility"
          value={stability.disciplineDuringVolatility}
          hint="Top-third sessions by deterioration count"
          sample={stability.sampleCounts.volatility}
          tone="pressure"
        />
      </div>
    </section>
  );
}
