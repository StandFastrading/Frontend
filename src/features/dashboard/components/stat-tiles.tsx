"use client";

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
import { useSessionIntelligence } from "@/store/slices/session-intelligence-slice";
import { cn } from "@/lib/utils";

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
const TONE_CHROME: Record<BehavioralStateTone, StateChrome> = {
  stable: {
    icon: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
    text: "text-emerald-300",
    label: "",
    halo: "from-emerald-500/[0.06] via-emerald-500/[0.02] to-transparent",
    border: "border-emerald-500/25",
    panelBg: "bg-emerald-500/[0.03]",
    accent: "bg-emerald-400",
  },
  watchful: {
    icon: "bg-brand/15 text-brand ring-brand/40",
    text: "text-brand",
    label: "",
    halo: "from-brand/[0.05] via-brand/[0.02] to-transparent",
    border: "border-brand/25",
    panelBg: "bg-brand/[0.03]",
    accent: "bg-brand",
  },
  elevated: {
    icon: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
    text: "text-amber-300",
    label: "",
    halo: "from-amber-500/[0.07] via-amber-500/[0.02] to-transparent",
    border: "border-amber-500/30",
    panelBg: "bg-amber-500/[0.03]",
    accent: "bg-amber-400",
  },
  critical: {
    icon: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
    text: "text-rose-300",
    label: "",
    halo: "from-rose-500/[0.08] via-rose-500/[0.02] to-transparent",
    border: "border-rose-500/35",
    panelBg: "bg-rose-500/[0.04]",
    accent: "bg-rose-400",
  },
  lockdown: {
    icon: "bg-rose-500/20 text-rose-200 ring-rose-500/60",
    text: "text-rose-200",
    label: "",
    halo: "from-rose-500/[0.12] via-rose-500/[0.03] to-transparent",
    border: "border-rose-500/45",
    panelBg: "bg-rose-500/[0.05]",
    accent: "bg-rose-300",
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
  // pattern is holding the state up, otherwise falls back to the analysis
  // engine's pattern-escalation reasons.
  const banner = aggregation.floorApplied
    ? {
        title: "Behavioral floor active",
        body:
          aggregation.floorReason ??
          "Active behavioral patterns are holding the session state above its score band.",
      }
    : analysis.escalationDetected
      ? {
          title: "Escalation pattern detected",
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
            escalation reasons. */}
        {banner ? (
          <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
            <div className="flex flex-col gap-0.5 leading-tight">
              <span className="text-sm font-semibold text-rose-200">
                {banner.title}
              </span>
              <span className="text-xs leading-relaxed text-rose-200/80">
                {banner.body}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// Re-export for tests / debug surfaces that want to render every narrative
// in isolation. Not used by the panel directly.
export { BEHAVIORAL_STATE_NARRATIVE };
