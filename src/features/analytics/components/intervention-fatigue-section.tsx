"use client";

import { useMemo } from "react";
import {
  Activity,
  BellOff,
  Gauge,
  type LucideIcon,
} from "lucide-react";

import {
  computeFatigueMetrics,
  type FatigueMetrics,
} from "@/lib/analytics/intervention-fatigue-engine";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

// SECTION — Intervention Fatigue
//
// Three small cards summarizing how the fatigue engine paced warnings
// across the active timeframe. Driven entirely by
// intervention-fatigue-engine; the component only formats.

export function InterventionFatigueSection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  const traderId = useAppStore((s) => s.user.userId);

  const metrics = useMemo<FatigueMetrics>(
    () => computeFatigueMetrics({ ...inputs, traderId }, timeframe, nowMs),
    [inputs, traderId, timeframe, nowMs],
  );

  const hasAnyActivity =
    metrics.duplicatesSuppressed > 0 ||
    metrics.escalationTransitionCount > 0 ||
    metrics.averageInterWarningGapSec != null ||
    metrics.postWarningResponsivenessRate > 0;

  return (
    <section
      aria-label="Intervention fatigue"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Intervention Fatigue
        </span>
        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/60">
          {metrics.timeframeLabel} · {metrics.confidenceLabel}
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      {!hasAnyActivity ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <DuplicatesSuppressedCard metrics={metrics} />
          <ResponsivenessCard metrics={metrics} />
          <PacingCard metrics={metrics} />
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur">
      <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
        <BellOff className="size-4" />
      </span>
      <div className="flex flex-col gap-1 leading-tight">
        <span className="text-sm font-semibold text-foreground">
          No fatigue activity in this window
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Fatigue metrics surface when the system suppresses duplicate
          warnings or paces escalations. Quiet windows are good signal
          — nothing to suppress means nothing to repeat.
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
  children,
}: {
  icon: LucideIcon;
  title: string;
  caveat?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 p-5 backdrop-blur">
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

function DuplicatesSuppressedCard({ metrics }: { metrics: FatigueMetrics }) {
  return (
    <CardShell
      icon={BellOff}
      title="Duplicate Warnings Suppressed"
      caveat="Same-family warnings that fell inside a cooldown window. Suppression preserves warning weight; it does not hide behavior."
    >
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-3xl font-semibold tabular-nums",
            metrics.duplicatesSuppressed > 0
              ? "text-emerald-300"
              : "text-foreground",
          )}
        >
          {metrics.duplicatesSuppressed}
        </span>
        <span className="text-xs text-muted-foreground">in window</span>
      </div>
      <span className="text-xs leading-relaxed text-muted-foreground">
        {metrics.escalationTransitionCount} escalation transition
        {metrics.escalationTransitionCount === 1 ? "" : "s"} recorded — the
        engine only re-opened when severity actually climbed.
      </span>
    </CardShell>
  );
}

function ResponsivenessCard({ metrics }: { metrics: FatigueMetrics }) {
  const hasData = metrics.postWarningResponsivenessRate > 0;
  return (
    <CardShell
      icon={Gauge}
      title="Post-Warning Responsiveness"
      caveat="% of warnings followed by a cancel or revise inside the 90-second grace window."
    >
      {hasData ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-emerald-300">
              {metrics.postWarningResponsivenessRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              warnings responded to
            </span>
          </div>
          <span className="text-xs leading-relaxed text-foreground/80">
            Acting on the first nudge keeps warnings powerful. Repeated
            ignores are what burn the signal.
          </span>
        </>
      ) : (
        <span className="text-xs leading-relaxed text-muted-foreground">
          No warnings in this window have been paired with a cancel or
          revise inside the grace period yet.
        </span>
      )}
    </CardShell>
  );
}

function PacingCard({ metrics }: { metrics: FatigueMetrics }) {
  return (
    <CardShell
      icon={Activity}
      title="Intervention Pacing"
      caveat="Average gap between same-family warnings. Longer gaps reflect cleaner sessions or active suppression."
    >
      {metrics.averageInterWarningGapSec != null ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {metrics.averageInterWarningGapSec}s
            </span>
            <span className="text-xs text-muted-foreground">
              average gap
            </span>
          </div>
          <span className="text-xs leading-relaxed text-muted-foreground">
            Cooldown windows scale with severity (30–120s) and stretch
            when the session has been clean.
          </span>
        </>
      ) : (
        <span className="text-xs leading-relaxed text-muted-foreground">
          No same-family warning repeats in this window — pacing is
          irrelevant until at least one family fires twice.
        </span>
      )}
    </CardShell>
  );
}
