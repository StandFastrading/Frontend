"use client";

import { useMemo } from "react";
import { Eye } from "lucide-react";

import { computeInsightsFeed } from "@/lib/analytics/behavioral-insights-feed";
import type { InsightSeverity } from "@/lib/analytics/behavioral-insights-feed";
import {
  CONFIDENCE_LABEL,
  type ConfidenceLevel,
} from "@/lib/analytics/timeframe";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { cn } from "@/lib/utils";

// SECTION 7 — Behavioral Insights Feed
//
// Deterministic, rule-based observations. Every insight has a CONDITION,
// a CONFIDENCE level, and a TRACE so the trader can verify the claim
// against literal observed events. No motivational copy.

const SEVERITY_RING: Record<InsightSeverity, string> = {
  info: "border-emerald-500/25 bg-emerald-500/[0.04]",
  caution: "border-amber-500/25 bg-amber-500/[0.04]",
  warning: "border-rose-500/30 bg-rose-500/[0.06]",
  critical: "border-rose-500/50 bg-rose-500/[0.08]",
};

const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  info: "Info",
  caution: "Caution",
  warning: "Warning",
  critical: "Critical",
};

const SEVERITY_TEXT: Record<InsightSeverity, string> = {
  info: "text-emerald-300",
  caution: "text-amber-300",
  warning: "text-rose-300",
  critical: "text-rose-200",
};

const CONFIDENCE_TEXT: Record<ConfidenceLevel, string> = {
  insufficient: "text-muted-foreground",
  emerging: "text-muted-foreground",
  moderate: "text-foreground/85",
  high: "text-foreground",
};

export function InsightsFeedSection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  const insights = useMemo(
    () => computeInsightsFeed(inputs, timeframe, nowMs),
    [inputs, timeframe, nowMs],
  );

  return (
    <section
      aria-label="Behavioral insights feed"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Behavioral Insights
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      {insights.length === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur">
          <span className="flex size-9 items-center justify-center rounded-full bg-foreground/[0.04] text-muted-foreground ring-1 ring-white/10">
            <Eye className="size-4" />
          </span>
          <div className="flex flex-col gap-1 leading-tight">
            <span className="text-sm font-semibold text-foreground">
              No traceable insights in this window
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Insights surface here when behavioral conditions cross
              traceable thresholds. None observed yet.
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl border p-4 backdrop-blur",
                SEVERITY_RING[insight.severity],
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/10",
                    SEVERITY_TEXT[insight.severity],
                  )}
                >
                  {SEVERITY_LABEL[insight.severity]}
                </span>
                <span
                  className={cn(
                    "text-[0.6rem] uppercase tracking-[0.18em]",
                    CONFIDENCE_TEXT[insight.confidence],
                  )}
                >
                  {CONFIDENCE_LABEL[insight.confidence]}
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {insight.headline}
              </span>
              <span className="text-[0.7rem] leading-snug text-muted-foreground/85">
                {insight.trace}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
