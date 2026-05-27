"use client";

import { useMemo } from "react";
import { ArrowRight, ShieldAlert } from "lucide-react";

import { computeClusterRecurrence } from "@/lib/analytics/pattern-cluster-recurrence";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { cn } from "@/lib/utils";
import type { DetectionSeverity } from "@/lib/detection/behavioral-detection-engine";

// SECTION 3 — Behavioral Pattern Clusters
//
// Recurring clusters surfaced from the detection engine across the
// timeframe. Each card shows severity, session frequency, last
// occurrence, contributing detectors, and the common chain that
// typically fires inside the cluster.

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

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const deltaMin = Math.max(0, (Date.now() - t) / 60_000);
  if (deltaMin < 60) return `${Math.round(deltaMin)} min ago`;
  if (deltaMin < 24 * 60) return `${Math.round(deltaMin / 60)} h ago`;
  return `${Math.round(deltaMin / (24 * 60))} d ago`;
}

export function PatternClustersSection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  const clusters = useMemo(
    () => computeClusterRecurrence(inputs, timeframe, nowMs),
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

      {clusters.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur">
          <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
            <ShieldAlert className="size-4" />
          </span>
          <div className="flex flex-col gap-1 leading-tight">
            <span className="text-sm font-semibold text-foreground">
              No recurring clusters in this window
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Clusters surface here when 2+ related detections fire in
              the same session. None observed yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {clusters.map((cluster) => (
            <div
              key={cluster.cluster}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-5 backdrop-blur",
                SEVERITY_RING[cluster.severity],
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 leading-tight">
                  <span
                    className={cn(
                      "text-[0.6rem] font-semibold uppercase tracking-[0.2em]",
                      SEVERITY_TEXT[cluster.severity],
                    )}
                  >
                    {SEVERITY_LABEL[cluster.severity]}
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {cluster.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cluster.description}
                  </span>
                </div>
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    {cluster.sessionFrequency}
                  </span>
                  <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                    sessions
                  </span>
                </div>
              </div>

              {cluster.contributingDetectionIds.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {cluster.contributingDetectionIds.map((id) => (
                    <span
                      key={id}
                      className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground/80 ring-1 ring-white/10"
                    >
                      {id.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              ) : null}

              {cluster.commonChain.length > 0 ? (
                <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-background/20 p-3">
                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                    Common chain
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/85">
                    {cluster.commonChain.map((step, idx) => (
                      <span
                        key={`${step.eventType}-${idx}`}
                        className="flex items-center gap-1.5"
                      >
                        <span className="rounded bg-foreground/[0.04] px-2 py-0.5 ring-1 ring-white/10">
                          {step.label}
                        </span>
                        {idx < cluster.commonChain.length - 1 ? (
                          <ArrowRight className="size-3 text-muted-foreground" />
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
                <span>
                  {cluster.totalDetectionCount} detection
                  {cluster.totalDetectionCount === 1 ? "" : "s"} contributing
                </span>
                <span>
                  Last:{" "}
                  {cluster.lastOccurredAt
                    ? formatRelative(cluster.lastOccurredAt)
                    : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
