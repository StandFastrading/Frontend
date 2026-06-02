"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Brain, Lock, TriangleAlert } from "lucide-react";

import { useBehaviorAnalysis } from "@/lib/analysis/behavior-analysis-engine";
import {
  BEHAVIORAL_STATE_NARRATIVE,
  DISCIPLINE_BAND_LABEL,
  useBehavioralStateAggregation,
  type BehavioralStateLabel,
  type BehavioralStateTone,
  type DisciplineBand,
} from "@/lib/state/behavioral-state-aggregator";
import { useCurrentSessionTrades } from "@/lib/sessions/session-helpers";
import { useSessionIntelligence } from "@/store/slices/session-intelligence-slice";
import { cn } from "@/lib/utils";
import { TradeDetailView } from "@/features/journal/components/trade-detail-view";

// =============================================================================
// Behavioral Command Center anchor.
//
// The Session State label, narrative, and ambient tone come from the
// Behavioral State Aggregator — the synthesis layer that rolls all
// detections + intervention decisions + behavior events into a single
// time-decayed score and maps it to one of 8 states (focused → locked
// down). The aggregator carries detection-floor logic so an active
// critical pattern can never coexist with a "focused" or "calm" label.
//
// Discipline Score, Rules Followed, Impulsive Actions, and Warnings
// Ignored continue to read from the Behavior Analysis Engine + Session
// Intelligence layer. Those numbers are session report-card metrics —
// they cleanly complement the forward-looking psychological state above.
// =============================================================================

type StateChrome = {
  icon: string;
  text: string;
  label: string;
  halo: string;
  border: string;
  panelBg: string;
  accent: string;
};

// Visual tone vocabulary (5 tones) → state-specific chrome. The aggregator
// classifies each state into one of these tones; we then map tone to a
// concrete palette. Keeping the indirection here means a future palette
// shift only touches this file, not the engine.
type StateChromeWithGlow = StateChrome & { glow: string };

const TONE_CHROME: Record<BehavioralStateTone, StateChromeWithGlow> = {
  stable: {
    icon: "bg-emerald-500/20 text-emerald-200 ring-emerald-500/50 shadow-[0_0_24px_-6px_rgba(16,185,129,0.55)]",
    text: "text-emerald-300",
    label: "",
    halo: "from-emerald-500/[0.12] via-emerald-500/[0.04] to-transparent",
    border: "border-emerald-500/40",
    panelBg: "bg-emerald-500/[0.05]",
    accent: "bg-emerald-400",
    glow: "shadow-[0_0_60px_-20px_rgba(16,185,129,0.35)]",
  },
  watchful: {
    icon: "bg-brand/20 text-brand ring-brand/55 shadow-[0_0_24px_-6px_oklch(0.62_0.22_255/0.55)]",
    text: "text-brand",
    label: "",
    halo: "from-brand/[0.10] via-brand/[0.04] to-transparent",
    border: "border-brand/40",
    panelBg: "bg-brand/[0.05]",
    accent: "bg-brand",
    glow: "shadow-[0_0_60px_-20px_oklch(0.62_0.22_255/0.35)]",
  },
  elevated: {
    icon: "bg-amber-500/20 text-amber-200 ring-amber-500/55 shadow-[0_0_24px_-6px_rgba(245,158,11,0.55)]",
    text: "text-amber-300",
    label: "",
    halo: "from-amber-500/[0.14] via-amber-500/[0.04] to-transparent",
    border: "border-amber-500/45",
    panelBg: "bg-amber-500/[0.05]",
    accent: "bg-amber-400",
    glow: "shadow-[0_0_60px_-20px_rgba(245,158,11,0.4)]",
  },
  critical: {
    icon: "bg-rose-500/20 text-rose-200 ring-rose-500/55 shadow-[0_0_28px_-6px_rgba(244,63,94,0.6)]",
    text: "text-rose-300",
    label: "",
    halo: "from-rose-500/[0.16] via-rose-500/[0.05] to-transparent",
    border: "border-rose-500/50",
    panelBg: "bg-rose-500/[0.06]",
    accent: "bg-rose-400",
    glow: "shadow-[0_0_60px_-20px_rgba(244,63,94,0.45)]",
  },
  lockdown: {
    icon: "bg-rose-500/30 text-rose-100 ring-rose-500/70 shadow-[0_0_32px_-4px_rgba(244,63,94,0.7)]",
    text: "text-rose-200",
    label: "",
    halo: "from-rose-500/[0.22] via-rose-500/[0.06] to-transparent",
    border: "border-rose-500/60",
    panelBg: "bg-rose-500/[0.08]",
    accent: "bg-rose-300",
    glow: "shadow-[0_0_70px_-15px_rgba(244,63,94,0.55)]",
  },
};

// Display label per state. Stored here rather than the engine because it's
// a presentation concern (the engine's wire identifiers stay snake_case so
// they're persistable + analytics-friendly).
const STATE_LABEL: Record<BehavioralStateLabel, string> = {
  focused: "Focused",
  controlled: "Controlled",
  stable: "Stable",
  overtrading: "Overtrading",
  escalating: "Escalating",
  reactive: "Reactive",
  impulsive: "Impulsive",
  fatigued: "Fatigued",
  locked_down: "Locked Down",
};

// Mapping back to the engine's tone classification.
const STATE_TONE: Record<BehavioralStateLabel, BehavioralStateTone> = {
  focused: "stable",
  controlled: "stable",
  stable: "watchful",
  overtrading: "watchful",
  escalating: "elevated",
  reactive: "elevated",
  impulsive: "critical",
  fatigued: "critical",
  locked_down: "lockdown",
};

// Short user-facing label per deviation type. Used by the escalation
// banner to surface the offending trade's top 2–3 deviations as inline
// chips. Wire identifiers persist; this map only governs display copy.
const DEVIATION_CHIP_LABEL: Record<string, string> = {
  stop_moved_further: "Stop widened",
  stop_tightened: "Stop tightened",
  position_size_increased: "Size increased",
  averaging_down: "Averaging down",
  reward_risk_degraded: "Risk adjusted",
  excessive_adds: "Added position",
  risk_exposure_increased: "Risk increased",
  behavioral_mistake_logged: "Mistake logged",
  rapid_post_loss_reactivation: "Rapid re-entry",
  oversized_exposure_increase: "Oversized exposure",
};

function chipLabelFor(deviationType: string): string {
  return DEVIATION_CHIP_LABEL[deviationType] ?? deviationType;
}

// Discipline band → subtitle color. Mirrors the band semantics: exceptional
// + controlled read positive (emerald), unstable amber, degrading + critical
// rose. Keeps the gauge subtitle aligned with the numeric value's tier.
const DISCIPLINE_BAND_TEXT: Record<DisciplineBand, string> = {
  exceptional: "text-emerald-300",
  controlled: "text-emerald-300/90",
  unstable: "text-amber-300",
  degrading: "text-rose-300",
  critical: "text-rose-200",
};

function DisciplineGauge({ score, max }: { score: number; max: number }) {
  const percent = Math.min(1, score / max);
  const radius = 52;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - percent);
  return (
    <svg viewBox="0 0 140 80" aria-hidden className="h-20 w-full">
      <defs>
        <linearGradient id="gauge-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="oklch(0.62 0.22 255)" stopOpacity="0.4" />
          <stop offset="1" stopColor="oklch(0.62 0.22 255)" />
        </linearGradient>
      </defs>
      <path
        d={`M 18 70 A ${radius} ${radius} 0 0 1 122 70`}
        fill="none"
        stroke="oklch(1 0 0 / 0.08)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={`M 18 70 A ${radius} ${radius} 0 0 1 122 70`}
        fill="none"
        stroke="url(#gauge-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

// Supporting-signal cell. Quieter than the old hero tile — no card frame,
// just a label, value, and one-line read. Lives inside the dominant Session
// State panel so the trader sees these as *evidence for* the state, not as
// independent metrics competing for attention.
function SupportSignal({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: "default" | "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "rose"
          ? "text-rose-300"
          : "text-foreground";
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-semibold leading-none tabular-nums",
          toneClass,
        )}
      >
        {value}
      </span>
      <span className="text-[0.7rem] leading-snug text-muted-foreground">
        {hint}
      </span>
    </div>
  );
}

export function StatTiles() {
  const analysis = useBehaviorAnalysis();
  const intel = useSessionIntelligence();
  const aggregation = useBehavioralStateAggregation();
  const { closedTrades } = useCurrentSessionTrades();
  const [tradeDetailOpen, setTradeDetailOpen] = useState(false);

  // Resolve the offending trade to a ClosedTrade record so the popup can
  // render the existing Trade Detail View. If escalation came from an
  // active (not-yet-closed) trade, the View Trade button hides — we
  // don't synthesize a parallel detail surface.
  const escalationTrade = useMemo(() => {
    const source = analysis.escalationPerTradeSource;
    if (!source) return null;
    return closedTrades.find((t) => t.id === source.tradeId) ?? null;
  }, [analysis.escalationPerTradeSource, closedTrades]);

  const escalationChips = useMemo(() => {
    const types = analysis.escalationPerTradeSource?.deviationTypes ?? [];
    return types.slice(0, 3).map(chipLabelFor);
  }, [analysis.escalationPerTradeSource]);

  const tone = STATE_TONE[aggregation.state];
  const chrome = TONE_CHROME[tone];
  const stateLabel = STATE_LABEL[aggregation.state];
  const stateNarrative = aggregation.narrative;
  const isLockdown = aggregation.state === "locked_down";
  const StateIcon = isLockdown ? Lock : Brain;

  // Impulsive Actions excludes warning_ignored so this signal + the dedicated
  // "Warnings Ignored" signal communicate UNIQUE insight.
  const impulsiveActionCount =
    analysis.counts.mistake_logged +
    analysis.counts.stop_widened +
    analysis.counts.position_size_increased +
    analysis.counts.daily_risk_exceeded +
    analysis.counts.max_trades_exceeded;
  const impulsiveTone =
    impulsiveActionCount === 0
      ? "emerald"
      : impulsiveActionCount <= 1
        ? "amber"
        : "rose";
  const warningsTone =
    analysis.counts.warning_ignored === 0 ? "emerald" : "rose";

  // Banner copy — prefers the aggregator's floor reason when an active
  // pattern is holding the state up. Escalation has two presentations:
  // the rich per-trade variant (chips + deviation count + View Trade)
  // when a single trade crossed the deviation threshold, otherwise the
  // session-wide fallback that prints the first reason as body copy.
  const perTradeSource = analysis.escalationPerTradeSource;
  const banner: {
    title: string;
    body?: string;
    variant: "floor" | "per_trade" | "session";
  } | null = aggregation.floorApplied
    ? {
        variant: "floor",
        title: "Behavioral floor active",
        body:
          aggregation.floorReason ??
          "Active behavioral patterns are holding the session state above its score band.",
      }
    : analysis.escalationDetected
      ? perTradeSource
        ? { variant: "per_trade", title: "Escalation Pattern Detected" }
        : {
            variant: "session",
            title: "Escalation Pattern Detected",
            body:
              analysis.escalationReasons[0] ??
              "Repeated behavioral signals indicate compounding risk.",
          }
      : null;

  return (
    <section
      aria-label="Behavioral State"
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur",
        chrome.border,
        chrome.glow,
      )}
    >
      {/* Subtle directional halo — pulls the eye to the state label without
          using saturated color anywhere else on the dashboard. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
          chrome.halo,
        )}
      />

      <div className="relative flex flex-col gap-6 p-6 sm:p-7">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Session State
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.22em]",
              chrome.text,
            )}
          >
            <span className="relative flex size-2">
              <span
                className={cn(
                  "absolute inset-0 animate-ping rounded-full opacity-60",
                  chrome.accent,
                )}
              />
              <span
                className={cn(
                  "relative size-2 rounded-full",
                  chrome.accent,
                )}
              />
            </span>
            Live read
          </span>
        </div>

        {/* Dominant state declaration */}
        <div className="flex items-start gap-5">
          <span
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-xl ring-1",
              chrome.icon,
            )}
          >
            <StateIcon className="size-6" />
          </span>
          <div className="flex flex-col gap-2 leading-tight">
            <span
              className={cn(
                "text-3xl font-semibold uppercase tracking-[0.18em] sm:text-4xl",
                chrome.text,
              )}
            >
              {stateLabel}
            </span>
            <p className="max-w-xl text-sm leading-relaxed text-foreground/80">
              {stateNarrative}
            </p>
            {/* Session trajectory — derived from momentum + state + band.
                Tells the STORY of the session ("Recovery is gradual",
                "Pressure compounding") so the trader reads a direction,
                not just a current point. */}
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground/85">
              {aggregation.arcSummary}
            </p>
          </div>
        </div>

        {/* Supporting Signals — visually clustered as ONE strip, not four
            competing cards. Divider grid suggests they're related evidence. */}
        <div
          className={cn(
            "rounded-xl border border-white/10",
            chrome.panelBg,
          )}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
              Supporting Signals
            </span>
            <button
              type="button"
              className="flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              View Details
              <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 divide-y divide-white/[0.06] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {/* Discipline — Behavioral Integrity Score from the aggregator
                (the same time-decayed math that drives `state`), then capped
                by state ceiling. Locked Down can never display above 25,
                Impulsive above 35, etc. — score and state are guaranteed
                consistent. Subtitle shows the band label so the number has
                a human-readable interpretation. */}
            <div className="flex flex-col gap-1 px-4 py-3">
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                Discipline
              </span>
              <div className="relative -mt-2">
                <DisciplineGauge
                  score={aggregation.disciplineScore}
                  max={100}
                />
                <div className="absolute inset-0 flex items-end justify-center pb-1">
                  <span className="text-xl font-semibold leading-none tabular-nums text-foreground">
                    {aggregation.disciplineScore}
                    <span className="text-[0.7rem] font-normal text-muted-foreground">
                      {" "}
                      /100
                    </span>
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "text-[0.7rem] font-medium",
                  DISCIPLINE_BAND_TEXT[aggregation.disciplineBand],
                )}
              >
                {DISCIPLINE_BAND_LABEL[aggregation.disciplineBand]}
              </div>
            </div>

            <SupportSignal
              label="Rules Followed"
              value={
                <>
                  {intel.rulesFollowed.current}
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    / {intel.rulesFollowed.total}
                  </span>
                </>
              }
              hint={`${intel.rulesFollowed.adherence}% adherence`}
            />

            <SupportSignal
              label="Impulsive Actions"
              value={impulsiveActionCount}
              hint={
                impulsiveActionCount === 0
                  ? "Within your limit"
                  : "Review recommended"
              }
              tone={impulsiveTone}
            />

            <SupportSignal
              label="Warnings Ignored"
              value={analysis.counts.warning_ignored}
              hint={
                analysis.counts.warning_ignored === 0
                  ? "Every warning respected"
                  : "Review recommended"
              }
              tone={warningsTone}
            />
          </div>
        </div>

        {/* Behavioral alert banner — prefers the aggregator's detection
            floor reason (the active pattern that is contradicting the
            score band), falls back to the analysis engine's older
            escalation reasons. The per-trade escalation variant surfaces
            up to three deviation chips and a View Trade button that
            opens the existing Trade Detail View modal. */}
        {banner ? (
          <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
            <div className="flex flex-1 flex-col gap-1.5 leading-tight">
              <span className="text-sm font-semibold text-rose-200">
                {banner.title}
              </span>
              {banner.variant === "per_trade" && perTradeSource ? (
                <>
                  {escalationChips.length > 0 ? (
                    <span className="text-xs leading-relaxed text-rose-200/80">
                      {escalationChips.join(" • ")}
                    </span>
                  ) : null}
                  <span className="text-xs leading-relaxed text-rose-200/70">
                    {perTradeSource.deviationCount} deviations within a single
                    trade
                  </span>
                  {escalationTrade ? (
                    <button
                      type="button"
                      onClick={() => setTradeDetailOpen(true)}
                      className="mt-1 inline-flex w-fit items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-rose-100 transition-colors hover:bg-rose-500/20"
                    >
                      View Trade
                      <ArrowRight className="size-3" />
                    </button>
                  ) : null}
                </>
              ) : (
                <span className="text-xs leading-relaxed text-rose-200/80">
                  {banner.body}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <TradeDetailView
        trade={escalationTrade}
        open={tradeDetailOpen && escalationTrade != null}
        onOpenChange={setTradeDetailOpen}
      />
    </section>
  );
}

// Re-export for tests / debug surfaces that want to render every narrative
// in isolation. Not used by the panel directly.
export { BEHAVIORAL_STATE_NARRATIVE };
