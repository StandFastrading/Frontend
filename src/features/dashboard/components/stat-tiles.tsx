"use client";

import { ArrowRight, ArrowUp, Brain, TriangleAlert } from "lucide-react";

import {
  useBehaviorAnalysis,
  type SessionStateLabel,
} from "@/lib/analysis/behavior-analysis-engine";
import { useSessionIntelligence } from "@/store/slices/session-intelligence-slice";
import { cn } from "@/lib/utils";

// Headline metric strip on the dashboard. Reads live from the centralized
// Session Intelligence layer — every value updates in real time as the
// trader produces behavior events, closes trades, etc. No static mock
// data; layout matches what was here before.

function Tile({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur",
        className,
      )}
    >
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

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

// Maps the deterministic 5-state classifier to per-tile presentation. Order
// matches the SessionStateLabel union; presentational only, no logic.
const SESSION_TONE: Record<
  SessionStateLabel,
  { ring: string; text: string; label: string }
> = {
  calm: {
    ring: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    text: "text-emerald-400",
    label: "Calm",
  },
  focused: {
    ring: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    text: "text-emerald-400",
    label: "Focused",
  },
  caution: {
    ring: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    text: "text-amber-400",
    label: "Caution",
  },
  elevated: {
    ring: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
    text: "text-rose-400",
    label: "Elevated",
  },
  "high-risk": {
    ring: "bg-rose-500/20 text-rose-300 ring-rose-500/50",
    text: "text-rose-300",
    label: "High Risk",
  },
};

// Short, emotionally readable Session State subtitle. Intentionally NOT the
// engine's `explanationSummary` (which is dense + analytical — reserved for
// Reports). The dashboard answers "How did I behave today?" — single
// sentence, no numbers.
const SESSION_NARRATIVE: Record<SessionStateLabel, string> = {
  focused:
    "Trader followed plan structure with minimal intervention.",
  calm: "Steady execution within your rules.",
  caution: "Discipline weakened after multiple overrides.",
  elevated: "Behavioral risk rising — review the deviation log.",
  "high-risk":
    "Repeated warning overrides and elevated risk behavior detected.",
};

export function StatTiles() {
  // Discipline + session-state + warning-ignored count come from the
  // Behavior Analysis Engine. The session-intelligence layer is still
  // consumed for the Rules Followed adherence math + per-tile shapes that
  // the analysis engine doesn't produce.
  const analysis = useBehaviorAnalysis();
  const intel = useSessionIntelligence();

  const sessionTone = SESSION_TONE[analysis.sessionState];
  const sessionNarrative = SESSION_NARRATIVE[analysis.sessionState];
  // Impulsive Actions in the tile excludes warning_ignored so this tile +
  // the dedicated "Warnings Ignored" tile communicate UNIQUE insight.
  // Warnings still count toward the engine's `impulsiveActionCount` field
  // (analytics + Reports), which is why we don't touch the engine — this
  // is presentation-only de-duplication.
  const impulsiveActionCount =
    analysis.counts.mistake_logged +
    analysis.counts.stop_widened +
    analysis.counts.position_size_increased +
    analysis.counts.daily_risk_exceeded +
    analysis.counts.max_trades_exceeded;
  const impulsiveTone =
    impulsiveActionCount === 0
      ? "text-emerald-400"
      : impulsiveActionCount <= 1
        ? "text-amber-400"
        : "text-rose-400";
  const warningsTone =
    analysis.counts.warning_ignored === 0
      ? "text-emerald-400"
      : "text-rose-400";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Session State */}
      <Tile label="Session State">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full ring-1",
              sessionTone.ring,
            )}
          >
            <Brain className="size-5" />
          </span>
          <div className="flex flex-col gap-1 leading-tight">
            <span
              className={cn(
                "text-sm font-semibold uppercase tracking-wide",
                sessionTone.text,
              )}
            >
              {sessionTone.label}
            </span>
            <span className="text-xs leading-snug text-muted-foreground">
              {sessionNarrative}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="mt-1 flex items-center justify-center gap-1.5 rounded-md border border-white/15 bg-background/40 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          View Details
          <ArrowRight className="size-3" />
        </button>
      </Tile>

      {/* Discipline Score */}
      <Tile label="Discipline Score">
        <div className="relative flex flex-col items-center">
          <DisciplineGauge score={analysis.disciplineScore} max={100} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-5">
            <span className="text-3xl font-semibold leading-none text-foreground">
              {analysis.disciplineScore}
              <span className="text-sm text-muted-foreground"> /100</span>
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400">
          <ArrowUp className="size-3.5" />
          <span className="font-semibold">
            {analysis.counts.clean_approved_trade}
          </span>
          <span className="text-muted-foreground">approved this session</span>
        </div>
      </Tile>

      {/* Rules Followed */}
      <Tile label="Rules Followed">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold leading-none text-foreground">
            {intel.rulesFollowed.current}
          </span>
          <span className="text-base text-muted-foreground">
            / {intel.rulesFollowed.total}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {intel.rulesFollowed.adherence}% Adherence
        </span>
        <div className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${intel.rulesFollowed.adherence}%` }}
          />
        </div>
      </Tile>

      {/* Impulsive Actions */}
      <Tile label="Impulsive Actions">
        <div className="flex items-baseline">
          <span
            className={cn("text-4xl font-semibold leading-none", impulsiveTone)}
          >
            {impulsiveActionCount}
          </span>
        </div>
        <div className={cn("mt-auto flex items-center gap-1.5 text-xs", impulsiveTone)}>
          <TriangleAlert className="size-3.5" />
          <span>
            {impulsiveActionCount === 0
              ? "Within your limit"
              : "Review recommended"}
          </span>
        </div>
      </Tile>

      {/* Warnings Ignored */}
      <Tile label="Warnings Ignored">
        <div className="flex items-baseline">
          <span
            className={cn("text-4xl font-semibold leading-none", warningsTone)}
          >
            {analysis.counts.warning_ignored}
          </span>
        </div>
        <div className={cn("mt-auto text-xs", warningsTone)}>
          {analysis.counts.warning_ignored === 0
            ? "Every warning respected"
            : "Review recommended"}
        </div>
      </Tile>
    </div>
  );
}
