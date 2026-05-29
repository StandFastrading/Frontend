"use client";

import { useMemo } from "react";
import { ArrowRight, ShieldAlert } from "lucide-react";

import {
  BEHAVIOR_EVENT_LABEL,
  computeBehaviorClusterFormations,
  type BehaviorClusterFormation,
  type FormationConfidence,
} from "@/lib/analytics/pattern-cluster-recurrence";
import type { EvidenceClassifiedBehavior } from "@/lib/analytics/evidence-weighting-engine";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { cn } from "@/lib/utils";
import type { DetectionSeverity } from "@/lib/detection/behavioral-detection-engine";

// SECTION 3 — Behavioral Pattern Clusters
//
// Renders cross-session BEHAVIOR FORMATIONS produced by the cluster
// engine. Each card shows the formation title + explanation, severity +
// confidence chips, contributing session count, the linked behavior
// types, the common chain extracted across qualifying sessions, and the
// last-observed timestamp.

const SEVERITY_RING: Record<DetectionSeverity, string> = {
  info: "border-emerald-500/30 bg-emerald-500/[0.05]",
  caution: "border-amber-500/30 bg-amber-500/[0.05]",
  warning: "border-rose-500/30 bg-rose-500/[0.06]",
  critical: "border-rose-500/50 bg-rose-500/[0.09]",
};

const SEVERITY_TEXT: Record<DetectionSeverity, string> = {
  info: "text-emerald-300",
  caution: "text-amber-300",
  warning: "text-rose-300",
  critical: "text-rose-200",
};

const SEVERITY_LABEL: Record<DetectionSeverity, string> = {
  info: "Info",
  caution: "Caution",
  warning: "Warning",
  critical: "Critical",
};

const CONFIDENCE_LABEL: Record<FormationConfidence, string> = {
  low: "Low confidence",
  moderate: "Moderate confidence",
  high: "High confidence",
};

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t) || t <= 0) return "—";
  const deltaMin = Math.max(0, (Date.now() - t) / 60_000);
  if (deltaMin < 60) return `${Math.round(deltaMin)} min ago`;
  if (deltaMin < 24 * 60) return `${Math.round(deltaMin / 60)} h ago`;
  return `${Math.round(deltaMin / (24 * 60))} d ago`;
}

export function PatternClustersSection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  const formations = useMemo(
    () => computeBehaviorClusterFormations(inputs, timeframe, nowMs),
    [inputs, timeframe, nowMs],
  );

  return (
    <section
      aria-label="Behavioral pattern clusters"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Behavioral Pattern Clusters
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      {formations.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur">
          <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
            <ShieldAlert className="size-4" />
          </span>
          <div className="flex flex-col gap-1 leading-tight">
            <span className="text-sm font-semibold text-foreground">
              No recurring clusters in this window
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Clusters surface here when the same behavior formation
              recurs across 2 or more sessions in the selected window.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {formations.map((formation) => (
            <FormationCard key={formation.clusterId} formation={formation} />
          ))}
        </div>
      )}
    </section>
  );
}

function FormationCard({ formation }: { formation: BehaviorClusterFormation }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-5 backdrop-blur",
        SEVERITY_RING[formation.severity],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 leading-tight">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-[0.6rem] font-semibold uppercase tracking-[0.2em]",
                SEVERITY_TEXT[formation.severity],
              )}
            >
              {SEVERITY_LABEL[formation.severity]}
            </span>
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
              · {CONFIDENCE_LABEL[formation.confidence]}
            </span>
          </div>
          <span className="text-base font-semibold text-foreground">
            {formation.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {formation.explanation}
          </span>
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {formation.sessionsAffected}
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
            sessions
          </span>
        </div>
      </div>

      <EvidenceSection
        heading="Primary Evidence"
        subtitle="Directly observed in this window"
        rows={formation.evidenceBreakdown.primary}
        emptyCopy="No individual behavior events recorded yet."
        tone="primary"
      />

      {formation.evidenceBreakdown.correlated.length > 0 ? (
        <EvidenceSection
          heading="Strong Correlations"
          subtitle="Repeated relationships across qualifying sessions"
          rows={formation.evidenceBreakdown.correlated}
          tone="correlated"
        />
      ) : null}

      {formation.evidenceBreakdown.possible.length > 0 ? (
        <EvidenceSection
          heading="Possible Associations"
          subtitle="Conceptually related but not directly observed"
          rows={formation.evidenceBreakdown.possible}
          tone="possible"
        />
      ) : null}

      {formation.commonSequence.length > 0 ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-background/20 p-3">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Common chain
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/85">
            {formation.commonSequence.map((step, idx) => (
              <span
                key={`${step.eventType}-${idx}`}
                className="flex items-center gap-1.5"
              >
                <span className="rounded bg-foreground/[0.04] px-2 py-0.5 ring-1 ring-white/10">
                  {step.label}
                </span>
                {idx < formation.commonSequence.length - 1 ? (
                  <ArrowRight className="size-3 text-muted-foreground" />
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
        <span>
          {formation.occurrences} contributing observation
          {formation.occurrences === 1 ? "" : "s"}
        </span>
        <span>Last: {formatRelative(formation.lastObservedAt)}</span>
      </div>
    </div>
  );
}

// Evidence breakdown sub-card. Renders one of the three buckets emitted
// by the evidence-weighting engine. Returns null when there are no rows
// AND no emptyCopy fallback, so callers can mount this unconditionally
// for primary evidence (which has a fallback) and conditionally for
// the correlated / possible buckets (no fallback — silent when empty).

const EVIDENCE_TONE_CLASS: Record<
  "primary" | "correlated" | "possible",
  { chipText: string; chipRing: string }
> = {
  primary: {
    chipText: "text-emerald-300",
    chipRing: "ring-emerald-500/30 bg-emerald-500/10",
  },
  correlated: {
    chipText: "text-amber-300",
    chipRing: "ring-amber-500/30 bg-amber-500/10",
  },
  possible: {
    chipText: "text-muted-foreground",
    chipRing: "ring-white/10 bg-foreground/[0.04]",
  },
};

const EVIDENCE_TONE_BADGE: Record<
  "primary" | "correlated" | "possible",
  string
> = {
  primary: "OBSERVED",
  correlated: "CORRELATED",
  possible: "POSSIBLE",
};

function EvidenceSection({
  heading,
  subtitle,
  rows,
  emptyCopy,
  tone,
}: {
  heading: string;
  subtitle?: string;
  rows?: EvidenceClassifiedBehavior[];
  emptyCopy?: string;
  tone?: "primary" | "correlated" | "possible";
}) {
  const safeRows = rows ?? [];
  if (safeRows.length === 0 && !emptyCopy) return null;

  const toneKey = tone ?? "primary";
  const toneClass = EVIDENCE_TONE_CLASS[toneKey];
  const badge = EVIDENCE_TONE_BADGE[toneKey];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          {heading}
        </span>
        {subtitle ? (
          <span className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground/60">
            · {subtitle}
          </span>
        ) : null}
      </div>
      {safeRows.length === 0 ? (
        <span className="text-[0.7rem] leading-snug text-muted-foreground">
          {emptyCopy}
        </span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {safeRows.map((row) => (
            <span
              key={row.behaviorType}
              title={row.explanation}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground/85 ring-1",
                toneClass.chipRing,
              )}
            >
              <span
                className={cn(
                  "text-[0.55rem] font-semibold tracking-[0.18em]",
                  toneClass.chipText,
                )}
              >
                {badge}
              </span>
              <span>
                {BEHAVIOR_EVENT_LABEL[row.behaviorType] ?? row.label}
              </span>
              <span className="text-muted-foreground/70 tabular-nums">
                · {row.observedCount}/{row.sessionsAffected}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
