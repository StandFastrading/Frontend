"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Eye,
  PiggyBank,
  RefreshCw,
  ShieldOff,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import {
  computeInterventionOutcomes,
  OVERRIDE_OUTCOME_WINDOW_MIN,
  type InterventionOutcomeSummary,
  type ResponseQualityTone,
} from "@/lib/analytics/intervention-outcomes-engine";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

// SECTION — Intervention Outcomes
//
// Five cards that quantify the BEHAVIORAL value the rule-check system has
// delivered inside the active timeframe:
//   1. Estimated Risk Avoided — planned $ exposure on cancels + reductions
//                               on revisions. Conservative; not realized P/L.
//   2. Behavioral Intervention Outcomes — cancel / revise / override split.
//   3. Rule-Check Impact — average % reduction across revisions.
//   4. Behavioral Response Quality — qualitative read on the mix.
//   5. Override Consequence Rate — % of Continue Anyway followed by
//                                  deterioration or escalation.
//
// All numbers are sourced from the deterministic engine — see
// intervention-outcomes-engine.ts for the calculation contract. This
// component only formats + renders.

function formatUSD(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

const RESPONSE_TONE_CLASS: Record<
  ResponseQualityTone,
  { ring: string; text: string }
> = {
  insufficient: {
    ring: "border-white/10",
    text: "text-muted-foreground",
  },
  improving: {
    ring: "border-emerald-500/30 bg-emerald-500/[0.05]",
    text: "text-emerald-300",
  },
  mixed: {
    ring: "border-amber-500/30 bg-amber-500/[0.05]",
    text: "text-amber-300",
  },
  deteriorating: {
    ring: "border-rose-500/30 bg-rose-500/[0.06]",
    text: "text-rose-300",
  },
};

export function InterventionOutcomesSection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  // Stable prototype trader id — the persisted user.userId. Stamped on
  // every emitted record so a future per-trader retrieval layer (broker
  // history, AI mentor) can scope cleanly without re-keying.
  const traderId = useAppStore((s) => s.user.userId);

  const summary = useMemo<InterventionOutcomeSummary>(
    () =>
      computeInterventionOutcomes(
        { ...inputs, traderId, historicalBaselines: null },
        timeframe,
        nowMs,
      ),
    [inputs, traderId, timeframe, nowMs],
  );

  const hasData =
    summary.canceledTradeCount +
      summary.revisedTradeCount +
      summary.continueAnywayCount >
    0;

  return (
    <section
      aria-label="Intervention outcomes"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Intervention Outcomes
        </span>
        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/60">
          {timeframe.label} · {OVERRIDE_OUTCOME_WINDOW_MIN}-min outcome window
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <RiskAvoidedCard summary={summary} />
          <OutcomeBreakdownCard summary={summary} />
          <RuleCheckImpactCard summary={summary} />
          <ResponseQualityCard summary={summary} />
          <OverrideConsequenceCard summary={summary} />
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur">
      <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/30">
        <Sparkles className="size-4" />
      </span>
      <div className="flex flex-col gap-1 leading-tight">
        <span className="text-sm font-semibold text-foreground">
          No intervention decisions in this window yet
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Outcomes surface here as the trader resolves rule checks —
          Cancel, Revise, or Continue Anyway. Estimates are conservative
          and behavior-focused; never realized P/L.
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Cards
// -----------------------------------------------------------------------------

function CardShell({
  icon: Icon,
  title,
  caveat,
  ringClass,
  children,
}: {
  icon: LucideIcon;
  title: string;
  caveat?: string;
  ringClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 p-5 backdrop-blur",
        ringClass,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground ring-1 ring-white/10">
          <Icon className="size-3.5" />
        </span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
          {title}
        </span>
      </div>
      {children}
      {caveat ? (
        <span className="text-[0.65rem] leading-snug text-muted-foreground">
          {caveat}
        </span>
      ) : null}
    </div>
  );
}

function RiskAvoidedCard({ summary }: { summary: InterventionOutcomeSummary }) {
  return (
    <CardShell
      icon={PiggyBank}
      title="Estimated Risk Avoided"
      caveat="Estimated planned exposure — not realized P/L. Combines canceled trade risk and risk reductions from revisions before activation."
    >
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-emerald-300">
          {formatUSD(summary.estimatedRiskAvoidedUSD)}
        </span>
        <span className="text-xs text-muted-foreground">
          {summary.timeframeLabel.toLowerCase()}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-muted-foreground">
        <span className="tabular-nums">
          Cancels {formatUSD(summary.estimatedRiskAvoidedFromCancelsUSD)}
        </span>
        <span className="text-muted-foreground/40">·</span>
        <span className="tabular-nums">
          Revisions {formatUSD(summary.estimatedRiskAvoidedFromRevisionsUSD)}
        </span>
      </div>
      <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground/70">
        {summary.confidenceCopy}
      </span>
    </CardShell>
  );
}

function OutcomeBreakdownCard({
  summary,
}: {
  summary: InterventionOutcomeSummary;
}) {
  return (
    <CardShell
      icon={Eye}
      title="Behavioral Intervention Outcomes"
      caveat="Process counts only — every decision the trader made at the rule-check modal in this window."
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat
          label="Canceled"
          value={summary.canceledTradeCount}
          tone="emerald"
        />
        <Stat label="Revised" value={summary.revisedTradeCount} tone="amber" />
        <Stat
          label="Continued"
          value={summary.continueAnywayCount}
          tone="rose"
        />
      </div>
    </CardShell>
  );
}

function RuleCheckImpactCard({
  summary,
}: {
  summary: InterventionOutcomeSummary;
}) {
  const hasRevisions = summary.qualifyingRevisionCount > 0;
  return (
    <CardShell
      icon={RefreshCw}
      title="Rule-Check Impact"
      caveat="Average risk reduction across revisions where both pre- and post-decision risk readings were captured."
    >
      {hasRevisions ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-amber-300">
              {summary.averageRiskReductionPercent}%
            </span>
            <span className="text-xs text-muted-foreground">
              average reduction
            </span>
          </div>
          <span className="text-xs leading-relaxed text-foreground/80">
            You reduced planned exposure by{" "}
            {summary.averageRiskReductionPercent}% after behavioral warnings in
            this window.
          </span>
        </>
      ) : (
        <span className="text-xs leading-relaxed text-muted-foreground">
          No revisions with paired before/after risk readings yet. Revisions
          surface once a follow-up rule check or approval is recorded.
        </span>
      )}
    </CardShell>
  );
}

function ResponseQualityCard({
  summary,
}: {
  summary: InterventionOutcomeSummary;
}) {
  const tone = RESPONSE_TONE_CLASS[summary.responseQuality];
  return (
    <CardShell
      icon={CheckCircle2}
      title="Behavioral Response Quality"
      caveat={summary.confidenceLabel}
      ringClass={tone.ring}
    >
      <span
        className={cn(
          "text-sm font-semibold leading-snug",
          tone.text,
        )}
      >
        {summary.responseQualityCopy}
      </span>
      <div className="flex flex-wrap gap-1.5 text-[0.65rem] uppercase tracking-[0.14em]">
        <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 ring-1 ring-white/10 text-foreground/80">
          {summary.canceledTradeCount} canceled
        </span>
        <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 ring-1 ring-white/10 text-foreground/80">
          {summary.revisedTradeCount} revised
        </span>
        <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 ring-1 ring-white/10 text-foreground/80">
          {summary.continueAnywayCount} continued
        </span>
      </div>
    </CardShell>
  );
}

function OverrideConsequenceCard({
  summary,
}: {
  summary: InterventionOutcomeSummary;
}) {
  const hasOverrides = summary.continueAnywayCount > 0;
  return (
    <CardShell
      icon={ShieldOff}
      title="Override Consequence Rate"
      caveat={`Deterioration or escalation occurring within ${OVERRIDE_OUTCOME_WINDOW_MIN} minutes of a Continue Anyway decision.`}
    >
      {hasOverrides ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-rose-300">
              {summary.overrideConsequenceRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              of {summary.continueAnywayCount} override
              {summary.continueAnywayCount === 1 ? "" : "s"}
            </span>
          </div>
          <span className="text-xs leading-relaxed text-foreground/80">
            {summary.overrideConsequenceRate}% of Continue Anyway decisions
            resulted in deterioration or escalation in this window.
          </span>
        </>
      ) : (
        <span className="text-xs leading-relaxed text-muted-foreground">
          No Continue Anyway decisions recorded in this window — consequence
          rate surfaces once a warning is overridden.
        </span>
      )}
    </CardShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const valueTone =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : "text-rose-300";
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-background/30 p-3">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </span>
      <span className={cn("text-2xl font-semibold tabular-nums", valueTone)}>
        {value}
      </span>
    </div>
  );
}
