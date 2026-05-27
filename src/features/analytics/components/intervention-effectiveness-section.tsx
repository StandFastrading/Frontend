"use client";

import { useMemo } from "react";

import {
  computeInterventionEffectiveness,
  DETERIORATION_WINDOW_MIN,
} from "@/lib/analytics/intervention-analysis-engine";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { cn } from "@/lib/utils";

// SECTION 6 — Intervention Effectiveness
//
// Whether interventions actually changed behavior. This is StandFast's
// proof-of-thesis section: behavioral interruption must measurably change
// decision quality. Every metric is computed from observed events.

function RateBar({
  value,
  tone,
}: {
  value: number;
  tone: "emerald" | "amber" | "rose" | "brand";
}) {
  const barTone =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
        ? "bg-amber-400"
        : tone === "rose"
          ? "bg-rose-400"
          : "bg-brand";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
      <div
        className={cn("h-full rounded-full", barTone)}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "emerald" | "amber" | "rose" | "brand";
}) {
  const valueTone =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "rose"
          ? "text-rose-300"
          : "text-foreground";
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-card/40 p-4 backdrop-blur">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn("text-2xl font-semibold tabular-nums", valueTone)}
        >
          {value}
        </span>
        <span className="text-sm text-muted-foreground">%</span>
      </div>
      <RateBar value={value} tone={tone} />
      <span className="text-[0.7rem] leading-snug text-muted-foreground">
        {hint}
      </span>
    </div>
  );
}

export function InterventionEffectivenessSection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  const eff = useMemo(
    () => computeInterventionEffectiveness(inputs, timeframe, nowMs),
    [inputs, timeframe, nowMs],
  );

  return (
    <section
      aria-label="Intervention effectiveness"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Intervention Effectiveness
        </span>
        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/60">
          {DETERIORATION_WINDOW_MIN}-min outcome window
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      <div className="flex items-baseline justify-between rounded-xl border border-white/10 bg-card/40 px-4 py-3 backdrop-blur">
        <div className="flex flex-col leading-tight">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            Total intervention decisions
          </span>
          <span className="text-xs text-muted-foreground">
            Override · Revise · Cancel split below
          </span>
        </div>
        <div className="flex items-baseline gap-3 text-sm tabular-nums">
          <span className="text-2xl font-semibold text-foreground">
            {eff.totalDecisions}
          </span>
          <span className="text-rose-300">
            {eff.overrideCount} override
            {eff.overrideCount === 1 ? "" : "s"}
          </span>
          <span className="text-amber-300">{eff.reviseCount} revised</span>
          <span className="text-emerald-300">{eff.cancelCount} canceled</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Override rate"
          value={eff.overrideRate}
          hint="Continue Anyway as % of all decisions"
          tone="rose"
        />
        <Metric
          label="Cancel rate"
          value={eff.cancelRate}
          hint="Setup discarded after rule check"
          tone="emerald"
        />
        <Metric
          label="Revise rate"
          value={eff.reviseRate}
          hint="Returned to plan after rule check"
          tone="amber"
        />
        <Metric
          label="Post-warning deterioration"
          value={eff.postWarningDeteriorationRate}
          hint={`% of warnings followed by destructive events within ${DETERIORATION_WINDOW_MIN} min`}
          tone="rose"
        />
        <Metric
          label="Post-intervention stability"
          value={eff.postInterventionStabilityRate}
          hint={`% of decisions with NO destructive event within ${DETERIORATION_WINDOW_MIN} min`}
          tone="emerald"
        />
        <Metric
          label="Post-override stabilization"
          value={eff.postOverrideStabilizationRate}
          hint="Trader stabilized despite the override"
          tone="brand"
        />
      </div>
    </section>
  );
}
