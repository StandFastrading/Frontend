"use client";

import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import {
  useBehaviorAnalysis,
  type BehavioralTag,
  type BehaviorAnalysisResult,
} from "@/lib/analysis/behavior-analysis-engine";
import { cn } from "@/lib/utils";

// Today's Patterns reads exclusively from the Behavior Analysis Engine.
// Each row is a deterministic projection of the engine's counts/tags —
// no mock data, no AI inference, no hand-tuned heuristics outside the
// engine's scoring weights.

type PatternTone = "rose" | "amber" | "neutral" | "emerald";

const TONE: Record<PatternTone, string> = {
  rose: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
  amber: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  neutral: "bg-brand/15 text-brand ring-brand/30",
  emerald: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
};

type Pattern = {
  icon: LucideIcon;
  tone: PatternTone;
  title: string;
  value: string;
};

// Map a behavioral tag to a human-readable phrase. Used for the dominant
// behavior + the strongest positive tag. Avoids emotional language.
function humanizeTag(tag: BehavioralTag): string {
  switch (tag) {
    case "warning_ignored":
      return "Warnings ignored";
    case "risk_escalation":
      return "Risk escalation";
    case "stop_widening":
      return "Stop widening";
    case "oversized_position":
      return "Oversized position";
    case "revenge_risk":
      return "Post-loss re-entry";
    case "overtrading":
      return "Overtrading";
    case "mistake_logged":
      return "Mistakes logged";
    case "plan_followed":
      return "Plan followed";
    case "trade_avoided":
      return "Trades avoided after intervention";
    case "trade_revised":
      return "Trades revised after warning";
    case "clean_execution":
      return "Clean executions at plan";
  }
}

function pickStrongestPositive(
  analysis: BehaviorAnalysisResult,
): { tag: BehavioralTag; count: number } | null {
  const { counts } = analysis;
  const candidates: Array<{ tag: BehavioralTag; count: number }> = [
    { tag: "clean_execution", count: counts.clean_exit_at_plan },
    { tag: "trade_revised", count: counts.trade_revised },
    { tag: "trade_avoided", count: counts.trade_avoided },
    { tag: "plan_followed", count: counts.clean_approved_trade },
  ];
  const best = candidates
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)[0];
  return best ?? null;
}

// Highest-impact negative driver — the count×|weight| product is the
// arithmetic contribution to the score drop. Surfacing this answers "what
// hurt my score the most?".
function pickHighestRiskTrigger(
  analysis: BehaviorAnalysisResult,
): { label: string; count: number } | null {
  const { counts } = analysis;
  const candidates: Array<{ label: string; count: number; weight: number }> = [
    {
      label: "Daily risk exceeded",
      count: counts.daily_risk_exceeded,
      weight: 12,
    },
    {
      label: "Losing trade after ignored warning",
      count: counts.losing_trade_after_ignored_warning,
      weight: 10,
    },
    { label: "Stop widened", count: counts.stop_widened, weight: 10 },
    {
      label: "Warnings ignored",
      count: counts.warning_ignored,
      weight: 8,
    },
    {
      label: "Position size increased",
      count: counts.position_size_increased,
      weight: 8,
    },
    {
      label: "Max trades exceeded",
      count: counts.max_trades_exceeded,
      weight: 8,
    },
    {
      label: "Trade activated with warnings",
      count: counts.trade_activated_with_warnings,
      weight: 6,
    },
    { label: "Mistakes logged", count: counts.mistake_logged, weight: 5 },
  ];
  const best = candidates
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count * b.weight - a.count * a.weight)[0];
  return best ? { label: best.label, count: best.count } : null;
}

// Best discipline signal — the positive driver with the biggest score
// contribution. Mirror of highest-risk-trigger but on the credit side.
function pickBestDisciplineSignal(
  analysis: BehaviorAnalysisResult,
): { label: string; count: number } | null {
  const { counts } = analysis;
  const candidates: Array<{ label: string; count: number; weight: number }> = [
    { label: "Trades avoided after intervention", count: counts.trade_avoided, weight: 5 },
    { label: "Clean exits at plan", count: counts.clean_exit_at_plan, weight: 4 },
    { label: "Trades revised after warning", count: counts.trade_revised, weight: 4 },
    { label: "Clean approved trades", count: counts.clean_approved_trade, weight: 2 },
    { label: "Reflections added", count: counts.reflection_added, weight: 2 },
  ];
  const best = candidates
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count * b.weight - a.count * a.weight)[0];
  return best ? { label: best.label, count: best.count } : null;
}

// Conversational interpretation for each surfaced tag/label. The counts
// already appear on the StatTiles cards — repeating them here would clutter
// the experience and turn this card into a duplicated debug console. Today's
// Patterns is the BEHAVIORAL INSIGHT card; numbers belong on the metric
// cards, not here.
function buildPatterns(analysis: BehaviorAnalysisResult): Pattern[] {
  const dominantValue = analysis.dominantBehavior
    ? humanizeTag(analysis.dominantBehavior)
    : "No negative pattern yet";

  const strongestPositive = pickStrongestPositive(analysis);
  const strongestPositiveValue = strongestPositive
    ? humanizeTag(strongestPositive.tag)
    : "Awaiting positive signal";

  const highestRiskTrigger = pickHighestRiskTrigger(analysis);
  const highestRiskValue = highestRiskTrigger
    ? highestRiskTrigger.label
    : "No risk trigger";

  const bestSignal = pickBestDisciplineSignal(analysis);
  const bestSignalValue = bestSignal
    ? bestSignal.label
    : "Awaiting discipline signal";

  return [
    {
      icon: AlertCircle,
      tone: analysis.dominantBehavior ? "rose" : "emerald",
      title: "Dominant Behavior",
      value: dominantValue,
    },
    {
      icon: Sparkles,
      tone: strongestPositive ? "emerald" : "neutral",
      title: "Strongest Positive Behavior",
      value: strongestPositiveValue,
    },
    {
      icon: ShieldAlert,
      tone: highestRiskTrigger ? "amber" : "neutral",
      title: "Highest Risk Trigger",
      value: highestRiskValue,
    },
    {
      icon: bestSignal ? Award : CheckCircle2,
      tone: bestSignal ? "neutral" : "amber",
      title: "Best Discipline Signal",
      value: bestSignalValue,
    },
  ];
}


export function TodaysPatterns() {
  const analysis = useBehaviorAnalysis();
  const patterns = buildPatterns(analysis);

  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Today&rsquo;s Patterns
      </span>

      <ul className="flex flex-col gap-4">
        {patterns.map(({ icon: Icon, tone, title, value }) => (
          <li key={title} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full ring-1",
                TONE[tone],
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="flex flex-1 flex-col leading-tight">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {title}
              </span>
              <span className="text-sm font-medium text-foreground">
                {value}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        View Full Analysis
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
