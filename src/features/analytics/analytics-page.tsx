"use client";

import { useMemo, useState } from "react";

import {
  TIMEFRAMES,
  TimeframeContext,
  type TimeframeContextValue,
  type TimeframeId,
} from "@/lib/analytics/timeframe";

import { AnalyticsHeader } from "@/features/analytics/components/analytics-header";
import { BehavioralPatternsSection } from "@/features/analytics/components/behavioral-patterns-section";
import { BehavioralProfileHeader } from "@/features/analytics/components/behavioral-profile-header";
import { BehavioralTrendCharts } from "@/features/analytics/components/behavioral-trend-charts";
import { DisciplineStabilitySection } from "@/features/analytics/components/discipline-stability-section";
import { InsightsFeedSection } from "@/features/analytics/components/insights-feed-section";
import { AdaptiveInterventionSection } from "@/features/analytics/components/adaptive-intervention-section";
import { BehaviorProgressSection } from "@/features/analytics/components/behavior-progress-section";
import { InterventionEffectivenessSection } from "@/features/analytics/components/intervention-effectiveness-section";
import { InterventionFatigueSection } from "@/features/analytics/components/intervention-fatigue-section";
import { InterventionOutcomesSection } from "@/features/analytics/components/intervention-outcomes-section";
import { PatternClustersSection } from "@/features/analytics/components/pattern-clusters-section";
import { ReflectionCorrelationsSection } from "@/features/analytics/components/reflection-correlations-section";
import { SessionReplaySection } from "@/features/analytics/components/session-replay-section";
import { TodaysObjectiveSection } from "@/features/analytics/components/todays-objective-section";
import { WeeklyReviewSection } from "@/features/analytics/components/weekly-review-section";

// Behavioral Analytics — composed shell.
//
// Timeframe state is owned at the shell level + exposed via context so
// every section reads the same selected window without prop drilling.
// All sections are pure consumers of the analytics engines + the live
// app store; no analytics-specific persistence.

export function AnalyticsPage() {
  const [timeframeId, setTimeframeId] = useState<TimeframeId>("7d");
  const ctx = useMemo<TimeframeContextValue>(
    () => ({
      timeframe: TIMEFRAMES[timeframeId],
      setTimeframeId,
    }),
    [timeframeId],
  );

  return (
    <TimeframeContext.Provider value={ctx}>
      <div className="flex flex-col gap-6">
        <AnalyticsHeader />
        <BehavioralProfileHeader />
        <TodaysObjectiveSection />
        <WeeklyReviewSection />
        <BehaviorProgressSection />
        <BehavioralTrendCharts />
        <PatternClustersSection />
        <BehavioralPatternsSection />
        <InterventionOutcomesSection />
        <ReflectionCorrelationsSection />
        <DisciplineStabilitySection />
        <InterventionEffectivenessSection />
        <AdaptiveInterventionSection />
        <InterventionFatigueSection />
        <SessionReplaySection />
        <InsightsFeedSection />
      </div>
    </TimeframeContext.Provider>
  );
}
