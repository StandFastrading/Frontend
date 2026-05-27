import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import type {
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  MonitoringEvent,
} from "@/types";

// =============================================================================
// Per-trade behavioral classification
// =============================================================================
//
// Classifies a single closed trade based on the events it produced
// during its lifecycle. Returns ONE dominant classification (the most
// behaviorally severe pattern that fired) plus any secondary tags that
// also applied — so the UI can render a primary card + a tag row.
//
// Every classification is deterministic and traceable to observed
// events. No inference, no AI.
// =============================================================================

export const TRADE_CLASSIFICATION_IDS = [
  "clean_execution",
  "plan_followed",
  "mistake_logged",
  "stop_discipline_failure",
  "rule_defiance",
  "risk_escalation",
  "impulsive_entry",
  "impulsive_exit",
  "revenge_risk",
  "averaging_down",
] as const;
export type TradeClassificationId =
  (typeof TRADE_CLASSIFICATION_IDS)[number];

export type TradeClassificationSeverity =
  | "info"
  | "caution"
  | "warning"
  | "critical";

export type TradeClassification = {
  id: TradeClassificationId;
  label: string;
  severity: TradeClassificationSeverity;
  // One-line explanation. Clinical tone — describes what happened, not
  // how the trader should feel about it.
  description: string;
  // Additional classifications that ALSO applied to this trade but
  // weren't the dominant pattern. Sorted by severity desc.
  secondary: TradeClassificationId[];
};

const LABEL: Record<TradeClassificationId, string> = {
  clean_execution: "Clean Execution",
  plan_followed: "Plan Followed",
  mistake_logged: "Mistake Logged",
  stop_discipline_failure: "Stop Discipline Failure",
  rule_defiance: "Rule Defiance",
  risk_escalation: "Risk Escalation",
  impulsive_entry: "Impulsive Entry",
  impulsive_exit: "Impulsive Exit",
  revenge_risk: "Revenge Risk",
  averaging_down: "Averaging Down",
};

const SEVERITY: Record<TradeClassificationId, TradeClassificationSeverity> = {
  clean_execution: "info",
  plan_followed: "info",
  mistake_logged: "critical",
  averaging_down: "critical",
  stop_discipline_failure: "warning",
  rule_defiance: "warning",
  risk_escalation: "warning",
  impulsive_entry: "caution",
  impulsive_exit: "caution",
  revenge_risk: "warning",
};

const DESCRIPTION: Record<TradeClassificationId, string> = {
  clean_execution:
    "Trade followed the approved setup with no warnings, deviations, or mistakes.",
  plan_followed:
    "No deviations recorded. The trade was held inside its original plan boundaries.",
  mistake_logged:
    "Trader explicitly flagged this trade as a mistake. Behavioral lesson logged.",
  stop_discipline_failure:
    "Stop was widened beyond the approved invalidation level during the trade.",
  rule_defiance:
    "Trade proceeded after a warning override or had warnings dismissed mid-execution.",
  risk_escalation:
    "Position size or total risk was increased above the originally approved level.",
  impulsive_entry:
    "Trade was activated after acknowledged warnings on the approval check.",
  impulsive_exit:
    "Exit happened with significant deviations recorded near close time.",
  revenge_risk:
    "Trade activated within the post-loss cool-off window — re-entry was rapid.",
  averaging_down:
    "Position was added in the adverse direction of the original invalidation.",
};

const SEVERITY_RANK: Record<TradeClassificationSeverity, number> = {
  info: 0,
  caution: 1,
  warning: 2,
  critical: 3,
};

// -----------------------------------------------------------------------------
// Public entry point
//
// Inputs are already-filtered to this trade:
//   * `events` — behavior events with metadata.tradeId === trade.id
//   * `monitoringEvents` — events with .tradeId === trade.id
//   * `interventions` — interventions matched to this trade (symbol +
//     timing — caller is responsible for the linkage)
// -----------------------------------------------------------------------------
export function classifyTrade(
  trade: ClosedTrade,
  events: BehaviorEvent[],
  monitoringEvents: MonitoringEvent[],
  interventions: InterventionEvent[],
): TradeClassification {
  const fired = new Set<TradeClassificationId>();

  // -- Critical signals --
  if (trade.mistakeCount > 0) fired.add("mistake_logged");
  if (
    events.some(
      (e) => e.eventType === BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
    ) ||
    monitoringEvents.some((m) =>
      m.deviations.some((d) => d.type === "averaging_down"),
    )
  ) {
    fired.add("averaging_down");
  }

  // -- Warning signals --
  if (
    events.some(
      (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
    )
  ) {
    fired.add("stop_discipline_failure");
  }
  if (
    events.some(
      (e) =>
        e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
        e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    ) ||
    interventions.some((i) => i.decision === "continue_anyway")
  ) {
    fired.add("rule_defiance");
  }
  if (
    events.some(
      (e) =>
        e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED ||
        e.eventType === BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED ||
        e.eventType === BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
    )
  ) {
    fired.add("risk_escalation");
  }
  if (
    events.some(
      (e) =>
        e.eventType === BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
    )
  ) {
    fired.add("revenge_risk");
  }

  // -- Caution signals --
  // Impulsive entry — trade activated through the override pathway
  // (approval status warning OR a TRADE_OVERRIDE_ACCEPTED event near
  // activation). When rule_defiance is already firing this is a
  // secondary signal; otherwise it's the primary.
  if (
    events.some(
      (e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    )
  ) {
    fired.add("impulsive_entry");
  }

  // Impulsive exit — exit happened with deviations recorded between
  // exit time and trade close. Approximation: deviation count > 0 AND
  // last monitoring event landed within 5 min of closedAt.
  if (trade.deviationCount > 0 && monitoringEvents.length > 0) {
    const closeMs = new Date(trade.closedAt).getTime();
    const nearestMs = Math.max(
      ...monitoringEvents
        .map((m) => new Date(m.timestamp).getTime())
        .filter((t) => Number.isFinite(t)),
    );
    if (Number.isFinite(nearestMs) && closeMs - nearestMs <= 5 * 60_000) {
      fired.add("impulsive_exit");
    }
  }

  // -- Baseline (no destructive signals) --
  if (fired.size === 0) {
    if (
      (trade.outcome === "win" || trade.outcome === "breakeven") &&
      trade.deviationCount === 0 &&
      trade.mistakeCount === 0
    ) {
      return makeClassification("clean_execution", []);
    }
    return makeClassification("plan_followed", []);
  }

  // -- Pick dominant — highest severity wins; ties broken by spec
  //    order in TRADE_CLASSIFICATION_IDS (critical patterns appear
  //    earlier in that list, which already encodes the tie-breaker).
  const ranked = Array.from(fired).sort((a, b) => {
    const sevDelta = SEVERITY_RANK[SEVERITY[b]] - SEVERITY_RANK[SEVERITY[a]];
    if (sevDelta !== 0) return sevDelta;
    return (
      TRADE_CLASSIFICATION_IDS.indexOf(a) -
      TRADE_CLASSIFICATION_IDS.indexOf(b)
    );
  });
  const [dominant, ...rest] = ranked;
  return makeClassification(dominant, rest);
}

function makeClassification(
  id: TradeClassificationId,
  secondary: TradeClassificationId[],
): TradeClassification {
  return {
    id,
    label: LABEL[id],
    severity: SEVERITY[id],
    description: DESCRIPTION[id],
    secondary,
  };
}

// Convenience label/severity lookup for UI components that need to
// render secondary tags without re-running the engine.
export function labelForClassification(id: TradeClassificationId): string {
  return LABEL[id];
}
export function severityForClassification(
  id: TradeClassificationId,
): TradeClassificationSeverity {
  return SEVERITY[id];
}
