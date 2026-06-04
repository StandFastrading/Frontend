import {
  familyOfEvent,
  WARNING_FAMILY_LABEL,
  type WarningFamily,
} from "@/lib/analytics/intervention-fatigue-engine";
import type {
  ActiveTrade,
  BehavioralDeviation,
  DeviationSeverity,
  InterventionRecommendation,
  MonitoringEvent,
} from "@/types";

// =============================================================================
// Live deviation aggregation — UI-rendering layer over MonitoringEvent[]
// =============================================================================
//
// PURPOSE
//   The Active Trade Panel used to render every MonitoringEvent as its
//   own card, which stacked repeated stop-widening cards individually
//   and undermined the fatigue protection layer. This module groups
//   consecutive same-family / same-severity events into one evolving
//   summary so the trader sees the *escalation arc* instead of a list
//   of redundant alerts.
//
// SCOPE
//   PURE rendering-layer aggregation. Inputs are untouched. The full
//   MonitoringEvent log stays in the store, the analytics replay, and
//   the Trade Detail View (forensic surface). Group ids reference the
//   original event ids 1:1 so a future AI mentor query like "show all
//   stop mutations during this trade" can re-expand the group losslessly.
//
// GROUPING RULES
//   * Same warning family (from intervention-fatigue-engine taxonomy)
//   * Same severity
//   * Chronologically consecutive (no different-family event between)
//
//   Anything else (severity rises, new family appears) opens a new
//   group — mirrors the fatigue engine's escalation-reactivation rule.
// =============================================================================

const SEVERITY_RANK: Record<DeviationSeverity, number> = {
  info: 0,
  caution: 1,
  elevated: 2,
  critical: 3,
};

// Deviation-type → user-facing noun. When every event in a group shares
// the same primary deviation type, the UI can pluralize precisely
// ("2 stop modifications"); when a group mixes types it falls back to
// the family label.
const DEVIATION_TYPE_NOUN: Record<string, { singular: string; plural: string }> =
  {
    stop_moved_further: {
      singular: "stop modification",
      plural: "stop modifications",
    },
    stop_tightened: {
      singular: "stop tightening",
      plural: "stop tightenings",
    },
    position_size_increased: {
      singular: "size increase",
      plural: "size increases",
    },
    averaging_down: {
      singular: "averaging-down event",
      plural: "averaging-down events",
    },
    excessive_adds: {
      singular: "excessive add",
      plural: "excessive adds",
    },
    risk_exposure_increased: {
      singular: "risk exposure increase",
      plural: "risk exposure increases",
    },
    reward_risk_degraded: {
      singular: "reward:risk degradation",
      plural: "reward:risk degradations",
    },
    behavioral_mistake_logged: {
      singular: "mistake",
      plural: "mistakes",
    },
    rapid_post_loss_reactivation: {
      singular: "rapid re-entry",
      plural: "rapid re-entries",
    },
    oversized_exposure_increase: {
      singular: "oversized increase",
      plural: "oversized increases",
    },
  };

// AI-ready group record. Future retrieval can answer "show every stop
// mutation inside this group" via `eventIds`.
export type DeviationFamilyGroup = {
  groupId: string;
  family: WarningFamily;
  familyLabel: string;
  severity: DeviationSeverity;
  tradeId: string;
  eventIds: string[];
  eventCount: number;
  firstAt: string;
  latestAt: string;
  // Primary deviation type the group is "about". When events in the
  // group share one type, the UI can label precisely; mixed groups fall
  // back to the family label.
  primaryDeviationType: string;
  uniqueDeviationTypes: string[];
  // Headlines for the first vs. latest event — used by the collapsed
  // card to show "Latest change: 99.0 → 98.5" without a full history.
  firstHeadline: string;
  latestHeadline: string;
  // Numeric risk-per-share progression when the events carry stop
  // updates (the only update type that lets us compute |entry - stop|
  // without a snapshot of every intermediate change). Null when the
  // group's events don't change risk per share directly.
  riskProgression: {
    firstRiskPerShare: number | null;
    latestRiskPerShare: number | null;
    maxRiskPerShare: number | null;
  };
  // Latest event's recommendations — surfaces should display these on
  // the collapsed card so the "what to do" copy stays fresh.
  recommendations: InterventionRecommendation[];
};

function primaryDeviation(
  event: MonitoringEvent,
): BehavioralDeviation | null {
  if (event.deviations.length === 0) return null;
  let best = event.deviations[0];
  for (const d of event.deviations) {
    if (SEVERITY_RANK[d.severity] > SEVERITY_RANK[best.severity]) {
      best = d;
    }
  }
  return best;
}

function describeUpdate(update: MonitoringEvent["update"]): string {
  switch (update.type) {
    case "move_stop":
      return `Stop set to ${update.newStopPrice}`;
    case "move_target":
      return `Target set to ${update.newTargetPrice}`;
    case "add_position":
      return `Added ${update.additionalSize} at ${update.addedAtPrice}`;
    case "partial_exit":
      return `Reduced ${update.sizeReduced} at ${update.exitPrice}`;
    case "mark_mistake":
      return "Mistake flagged";
    case "log_exit":
      return `Exited at ${update.exitPrice} (${update.outcome})`;
  }
}

function eventHeadline(event: MonitoringEvent): string {
  const primary = primaryDeviation(event);
  return primary?.description ?? describeUpdate(event.update);
}

function riskPerShareAt(
  trade: ActiveTrade,
  event: MonitoringEvent,
): number | null {
  // Stop moves are the only update type where we can reconstruct
  // risk-per-share from the event alone (|entry - newStop|). For
  // position changes the snapshot would need entry-recomputation; not
  // worth modelling here — those groups still show count + headline.
  if (event.update.type === "move_stop") {
    return Math.abs(trade.entryPrice - event.update.newStopPrice);
  }
  return null;
}

// Public entry point. Groups newest-first to match the existing panel
// reading order; the trader sees the freshest active formation at the
// top of the timeline.
export function aggregateDeviationsByFamily(
  trade: ActiveTrade,
  events: MonitoringEvent[],
): DeviationFamilyGroup[] {
  if (events.length === 0) return [];
  // Sort chronologically ascending so consecutive same-family / same-
  // severity events accumulate into one group.
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const groups: DeviationFamilyGroup[] = [];
  let current: DeviationFamilyGroup | null = null;

  for (const event of sorted) {
    const primary = primaryDeviation(event);
    const deviationType = primary?.type ?? event.update.type;
    const family = familyOfEvent(deviationType);
    const severity = event.severity;
    const rps = riskPerShareAt(trade, event);
    const headline = eventHeadline(event);

    const canMerge =
      current != null &&
      current.family === family &&
      current.severity === severity;

    if (!canMerge) {
      if (current) groups.push(current);
      current = {
        groupId: `dgroup-${event.id}`,
        family,
        familyLabel: WARNING_FAMILY_LABEL[family],
        severity,
        tradeId: event.tradeId,
        eventIds: [event.id],
        eventCount: 1,
        firstAt: event.timestamp,
        latestAt: event.timestamp,
        primaryDeviationType: deviationType,
        uniqueDeviationTypes: [deviationType],
        firstHeadline: headline,
        latestHeadline: headline,
        riskProgression: {
          firstRiskPerShare: rps,
          latestRiskPerShare: rps,
          maxRiskPerShare: rps,
        },
        recommendations: event.recommendations,
      };
      continue;
    }

    // Merge into the current group.
    if (!current) continue; // narrowing for TS — covered by canMerge above
    current.eventIds.push(event.id);
    current.eventCount += 1;
    current.latestAt = event.timestamp;
    current.latestHeadline = headline;
    current.recommendations = event.recommendations;
    if (!current.uniqueDeviationTypes.includes(deviationType)) {
      current.uniqueDeviationTypes.push(deviationType);
    }
    if (rps != null) {
      current.riskProgression.latestRiskPerShare = rps;
      const prev = current.riskProgression.maxRiskPerShare;
      if (prev == null || rps > prev) {
        current.riskProgression.maxRiskPerShare = rps;
      }
      if (current.riskProgression.firstRiskPerShare == null) {
        current.riskProgression.firstRiskPerShare = rps;
      }
    }
  }
  if (current) groups.push(current);

  // Newest-first for the live panel.
  return groups.reverse();
}

// Plain-language pluralization for the count line on a group card. When
// all events in a group share one deviation type, uses the precise noun
// ("2 stop modifications"); mixed groups use the family label
// ("3 risk mutation events").
export function summarizeGroupCount(group: DeviationFamilyGroup): string {
  const allOneType =
    group.uniqueDeviationTypes.length === 1 &&
    DEVIATION_TYPE_NOUN[group.uniqueDeviationTypes[0]] != null;
  if (allOneType) {
    const noun = DEVIATION_TYPE_NOUN[group.primaryDeviationType];
    return `${group.eventCount} ${group.eventCount === 1 ? noun.singular : noun.plural} during active trade`;
  }
  return `${group.eventCount} ${group.familyLabel.toLowerCase()} event${group.eventCount === 1 ? "" : "s"} during active trade`;
}
