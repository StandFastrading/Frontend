import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import type { BehaviorEventType } from "@/lib/behavior-events";
import type {
  ActiveTrade,
  ActiveTradeUpdate,
  BehavioralDeviation,
  BehavioralDeviationType,
  DeviationSeverity,
  InterventionRecommendation,
  MonitoringEvent,
  RiskRules,
} from "@/types";

// Centralized Behavioral Deviation Engine. Pure function — no I/O, no React,
// no zustand. Consumers (active-trades slice today, Reports / Behavior
// Analytics later) call `detectDeviations(...)` with the trade, the proposed
// update, the trader's rules, and prior monitoring history, and receive back
// the deviations + advisory recommendations the update produces.
//
// Wording rule: deviations and recommendations describe behavior, not
// enforcement. The engine never emits "blocked", "prevented", "forced",
// "rejected" — it only reports what the trader did vs. their original plan
// and what reviewing it might look like.

export type DeviationEngineInput = {
  trade: ActiveTrade;
  update: ActiveTradeUpdate;
  riskRules: RiskRules;
  // Prior monitoring events for THIS trade, newest-first. Used by detectors
  // that need to count history (e.g. excessive_adds).
  priorEvents: MonitoringEvent[];
  // Whole behavior event log — lets the engine spot patterns that span
  // trades (e.g. rapid post-loss reactivation). Reserved for future use.
  behaviorEventLog?: unknown[];
};

export type DeviationEngineOutput = {
  deviations: BehavioralDeviation[];
  recommendations: InterventionRecommendation[];
  // Highest severity across all deviations. "info" if none triggered.
  severity: DeviationSeverity;
  // The wire eventType + display strings the slice uses to emit a matching
  // BehaviorEvent into the centralized feed. Picked from the dominant
  // (highest-severity) deviation when one exists; falls back to a neutral
  // event type when nothing deviated.
  primaryEventType: BehaviorEventType;
  displayTitle: string;
  displayDescription: string;
};

// Severity ordering for `max(...)` comparisons.
const SEVERITY_RANK: Record<DeviationSeverity, number> = {
  info: 0,
  caution: 1,
  elevated: 2,
  critical: 3,
};

function maxSeverity(
  a: DeviationSeverity,
  b: DeviationSeverity,
): DeviationSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Risk-per-share calc that's direction-aware. Positive value means real risk
// (entry > stop for longs, stop > entry for shorts).
function riskPerShare(
  entry: number,
  stop: number,
  direction: ActiveTrade["direction"],
): number {
  return direction === "Long" ? entry - stop : stop - entry;
}

function rewardPerShare(
  entry: number,
  target: number | null,
  direction: ActiveTrade["direction"],
): number | null {
  if (target == null) return null;
  return direction === "Long" ? target - entry : entry - target;
}

// =============================================================================
// Detector helpers — each appends 0 or more deviations to the bag.
// Recommendations are produced separately so we can prioritize by severity.
// =============================================================================

function detectMoveStop(
  trade: ActiveTrade,
  newStopPrice: number,
  bag: BehavioralDeviation[],
) {
  // Baseline stop may be null when the trade activated via override without
  // a defined stop. Any explicit Move Stop in that state is treated as the
  // trader introducing one for the first time — info-level event, no
  // deviation pattern to compare against.
  if (trade.stopPrice == null) {
    bag.push({
      id: genId("dev"),
      type: "stop_tightened",
      severity: "info",
      description: `Stop set to ${newStopPrice} on a trade that had no original stop.`,
      delta: { from: newStopPrice, to: newStopPrice, unit: "price" },
    });
    return;
  }

  const baselineRisk = riskPerShare(
    trade.entryPrice,
    trade.stopPrice,
    trade.direction,
  );
  const newRisk = riskPerShare(
    trade.entryPrice,
    newStopPrice,
    trade.direction,
  );

  if (newRisk > baselineRisk) {
    bag.push({
      id: genId("dev"),
      type: "stop_moved_further",
      severity: "elevated",
      description: `Stop widened from ${trade.stopPrice} to ${newStopPrice} — risk per share rose from ${baselineRisk.toFixed(2)} to ${newRisk.toFixed(2)}.`,
      delta: { from: trade.stopPrice, to: newStopPrice, unit: "price" },
    });
  } else if (newRisk < baselineRisk) {
    bag.push({
      id: genId("dev"),
      type: "stop_tightened",
      severity: "info",
      description: `Stop tightened from ${trade.stopPrice} to ${newStopPrice} — risk per share dropped from ${baselineRisk.toFixed(2)} to ${newRisk.toFixed(2)}.`,
      delta: { from: trade.stopPrice, to: newStopPrice, unit: "price" },
    });
  }
}

function detectAddPosition(
  trade: ActiveTrade,
  additionalSize: number,
  addedAtPrice: number,
  riskRules: RiskRules,
  priorEvents: MonitoringEvent[],
  bag: BehavioralDeviation[],
) {
  const newSize = trade.currentPositionSize + additionalSize;

  // Any add past the baseline lands a position_size_increased — what makes
  // it worse is *how* far past + whether it's averaging down.
  bag.push({
    id: genId("dev"),
    type: "position_size_increased",
    severity: newSize > trade.positionSize * 1.5 ? "elevated" : "caution",
    description: `Position grew from ${trade.currentPositionSize} to ${newSize} (baseline ${trade.positionSize}).`,
    delta: {
      from: trade.currentPositionSize,
      to: newSize,
      unit: "size",
    },
  });

  // Oversized exposure increase = single add larger than baseline position.
  // Distinct from position_size_increased so analytics can attribute the
  // pattern correctly.
  if (additionalSize > trade.positionSize) {
    bag.push({
      id: genId("dev"),
      type: "oversized_exposure_increase",
      severity: "elevated",
      description: `Single add of ${additionalSize} exceeds the original position size of ${trade.positionSize}.`,
      delta: {
        from: trade.positionSize,
        to: additionalSize,
        unit: "size",
      },
    });
  }

  // Averaging down: adding at a worse price than the original entry.
  const worsePrice =
    trade.direction === "Long"
      ? addedAtPrice < trade.entryPrice
      : addedAtPrice > trade.entryPrice;
  if (worsePrice) {
    bag.push({
      id: genId("dev"),
      type: "averaging_down",
      severity: "critical",
      description: `Add placed at ${addedAtPrice} vs original entry ${trade.entryPrice} — averaging into the loss.`,
      delta: { from: trade.entryPrice, to: addedAtPrice, unit: "price" },
    });
  }

  // Excessive adds: count prior add_position events. Threshold is the
  // trader's own `maxAddsPerTrade` setting.
  const priorAdds = priorEvents.filter(
    (e) => e.update.type === "add_position",
  ).length;
  if (priorAdds + 1 > riskRules.maxAddsPerTrade) {
    bag.push({
      id: genId("dev"),
      type: "excessive_adds",
      severity: "elevated",
      description: `Adds exceeded your configured cap of ${riskRules.maxAddsPerTrade} per trade.`,
      delta: {
        from: riskRules.maxAddsPerTrade,
        to: priorAdds + 1,
        unit: "size",
      },
    });
  }

  // Risk-exposure + reward:risk deviations need both stop + baseline risk.
  // When the trade activated without a defined stop, skip them — there's no
  // sensible "exposure exceeded approval" to compute against.
  const newAvgEntry =
    (trade.currentAvgEntry * trade.currentPositionSize +
      addedAtPrice * additionalSize) /
    newSize;
  if (trade.currentStopPrice != null && trade.originalRisk != null) {
    const newRisk =
      riskPerShare(newAvgEntry, trade.currentStopPrice, trade.direction) *
      newSize;
    if (newRisk > trade.originalRisk) {
      bag.push({
        id: genId("dev"),
        type: "risk_exposure_increased",
        severity: "elevated",
        description: `Total trade risk grew from $${trade.originalRisk.toFixed(2)} to $${newRisk.toFixed(2)} — exposure increased beyond the approved plan.`,
        delta: { from: trade.originalRisk, to: newRisk, unit: "dollars" },
      });
    }
  }

  // Reward:risk degradation — recompute with the new avg entry + same
  // target. If the ratio dropped below the originally-approved ratio, flag.
  if (
    trade.targetPrice != null &&
    trade.rewardRiskRatio != null &&
    trade.currentStopPrice != null
  ) {
    const newRewardPS = rewardPerShare(
      newAvgEntry,
      trade.targetPrice,
      trade.direction,
    );
    const newRiskPS = riskPerShare(
      newAvgEntry,
      trade.currentStopPrice,
      trade.direction,
    );
    if (
      newRewardPS != null &&
      newRiskPS > 0 &&
      newRewardPS / newRiskPS < trade.rewardRiskRatio
    ) {
      const newRatio = newRewardPS / newRiskPS;
      bag.push({
        id: genId("dev"),
        type: "reward_risk_degraded",
        severity: "caution",
        description: `Reward:risk dropped from ${trade.rewardRiskRatio.toFixed(2)} : 1 to ${newRatio.toFixed(2)} : 1.`,
        delta: {
          from: trade.rewardRiskRatio,
          to: newRatio,
          unit: "ratio",
        },
      });
    }
  }
}

function detectMarkMistake(note: string, bag: BehavioralDeviation[]) {
  bag.push({
    id: genId("dev"),
    type: "behavioral_mistake_logged",
    severity: "caution",
    description:
      note.trim().length > 0
        ? `Trader flagged this trade as a mistake — "${note.trim()}"`
        : "Trader flagged this trade as a mistake.",
  });
}

// =============================================================================
// Recommendation builder — maps deviations to advisory next-steps for the
// Active Trade Monitoring panel banner. One recommendation per deviation
// type max, deduplicated.
// =============================================================================

const RECOMMENDATION_TEMPLATES: Record<
  BehavioralDeviationType,
  Omit<InterventionRecommendation, "id">
> = {
  stop_moved_further: {
    severity: "elevated",
    title: "Stop widened beyond approved risk",
    body: "Review whether the original invalidation level still holds. Consider whether the wider stop matches your written plan or is a reaction to current price action.",
  },
  stop_tightened: {
    severity: "info",
    title: "Stop tightened",
    body: "Confirm the new level still respects the structural invalidation in your plan.",
  },
  position_size_increased: {
    severity: "caution",
    title: "Position size exceeds approved amount",
    body: "Review whether the add matches your written plan. Adds outside a planned scale-in often correlate with chasing.",
  },
  averaging_down: {
    severity: "critical",
    title: "Add placed against position",
    body: "Adding into an adverse move reverses the original invalidation logic. Review recommended before any further action.",
  },
  reward_risk_degraded: {
    severity: "caution",
    title: "Reward:risk below approved minimum",
    body: "The trade no longer matches the math you approved. Consider whether the new ratio still meets your minimum.",
  },
  excessive_adds: {
    severity: "elevated",
    title: "Adds exceed configured cap",
    body: "You've added more times than your Rules & Risk allows for a single trade. Review recommended before any further adds.",
  },
  risk_exposure_increased: {
    severity: "elevated",
    title: "Total risk exceeds approval",
    body: "Increased exposure detected. The dollar risk on the trade is now above what you approved at the desk. Review whether this still fits your daily plan.",
  },
  behavioral_mistake_logged: {
    severity: "caution",
    title: "Mistake logged for review",
    body: "Your note is preserved on this trade and on the behavior feed. Journaling the cause is the highest-leverage habit StandFast can encourage.",
  },
  rapid_post_loss_reactivation: {
    severity: "elevated",
    title: "Re-entry within post-loss window",
    body: "A new trade was marked active shortly after a logged loss. Consider whether the cool-off window from your rules should apply here.",
  },
  oversized_exposure_increase: {
    severity: "elevated",
    title: "Single add exceeds original position",
    body: "Increased exposure detected from a single add. Review whether the trade still resembles the plan you approved.",
  },
};

function buildRecommendations(
  deviations: BehavioralDeviation[],
): InterventionRecommendation[] {
  // Deduplicate by deviation type — one rec per pattern. Sort by severity
  // descending so the banner shows the most-actionable item first.
  const seen = new Set<BehavioralDeviationType>();
  const out: InterventionRecommendation[] = [];
  for (const dev of deviations) {
    if (seen.has(dev.type)) continue;
    seen.add(dev.type);
    const template = RECOMMENDATION_TEMPLATES[dev.type];
    out.push({ id: genId("rec"), ...template });
  }
  return out.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
}

// =============================================================================
// Primary BehaviorEvent picker — maps the dominant deviation (or the bare
// update type when nothing deviated) to the wire eventType + display strings
// the centralized behavior feed shows.
// =============================================================================

const DEVIATION_TO_EVENT: Record<BehavioralDeviationType, BehaviorEventType> = {
  stop_moved_further: BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  stop_tightened: BEHAVIOR_EVENT_TYPES.STOP_TIGHTENED,
  position_size_increased: BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED,
  averaging_down: BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED,
  reward_risk_degraded: BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED,
  excessive_adds: BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
  risk_exposure_increased: BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
  behavioral_mistake_logged: BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED,
  rapid_post_loss_reactivation: BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION,
  oversized_exposure_increase: BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED,
};

function pickPrimaryEventType(
  update: ActiveTradeUpdate,
  deviations: BehavioralDeviation[],
): BehaviorEventType {
  // Dominant deviation wins — that's the line the trader will see in the
  // feed. When no deviation triggered, fall back to the neutral version of
  // the action.
  if (deviations.length > 0) {
    const dominant = [...deviations].sort(
      (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
    )[0];
    return DEVIATION_TO_EVENT[dominant.type];
  }
  switch (update.type) {
    case "move_stop":
      return BEHAVIOR_EVENT_TYPES.STOP_MOVED;
    case "move_target":
      return BEHAVIOR_EVENT_TYPES.TARGET_MOVED;
    case "add_position":
      return BEHAVIOR_EVENT_TYPES.POSITION_ADDED;
    case "partial_exit":
      return BEHAVIOR_EVENT_TYPES.PARTIAL_EXIT_LOGGED;
    case "mark_mistake":
      return BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED;
    case "log_exit":
      return BEHAVIOR_EVENT_TYPES.TRADE_EXIT_LOGGED;
  }
}

// =============================================================================
// Entry point
// =============================================================================

export function detectDeviations(
  input: DeviationEngineInput,
): DeviationEngineOutput {
  const { trade, update, riskRules, priorEvents } = input;
  const deviations: BehavioralDeviation[] = [];

  switch (update.type) {
    case "move_stop":
      detectMoveStop(trade, update.newStopPrice, deviations);
      break;
    case "add_position":
      detectAddPosition(
        trade,
        update.additionalSize,
        update.addedAtPrice,
        riskRules,
        priorEvents,
        deviations,
      );
      break;
    case "mark_mistake":
      detectMarkMistake(update.note, deviations);
      break;
    case "partial_exit":
    case "log_exit":
      // No deviation surface today — partial exits and full exits reduce
      // exposure, which we treat as info. Future detectors (e.g. early exit
      // vs target, hold-time deviation) hook in here.
      break;
    case "move_target":
      // Behavioral-data capture only. Target moves aren't deviations —
      // extending a target on momentum or shifting to a new resistance
      // level is often disciplined behavior. The reason metadata
      // persists on the monitoring event for future analytics
      // (target-extension frequency, scaling discipline).
      break;
  }

  const severity = deviations.reduce<DeviationSeverity>(
    (acc, d) => maxSeverity(acc, d.severity),
    "info",
  );

  const recommendations = buildRecommendations(deviations);
  const primaryEventType = pickPrimaryEventType(update, deviations);

  // Description used on the behavior feed entry — short, free of execution
  // verbs. Comes from the dominant deviation when one exists; falls back to
  // a neutral summary keyed off the update type.
  const dominant = deviations[0];
  const displayTitle = dominant
    ? labelFor(dominant.type)
    : neutralLabel(update);
  const displayDescription = dominant
    ? dominant.description
    : neutralDescription(update);

  return {
    deviations,
    recommendations,
    severity,
    primaryEventType,
    displayTitle,
    displayDescription,
  };
}

// Deviation labels read like institutional-risk shorthand: the title
// states the actual condition the engine detected, not a side effect or
// emotion. Reused by the feed entry display + the per-event deviation
// timeline in the active panel.
function labelFor(type: BehavioralDeviationType): string {
  switch (type) {
    case "stop_moved_further":
      return "Stop widened beyond approved risk";
    case "stop_tightened":
      return "Stop tightened";
    case "position_size_increased":
      return "Position size exceeds approved amount";
    case "averaging_down":
      return "Add placed against position";
    case "reward_risk_degraded":
      return "Reward:risk below approved minimum";
    case "excessive_adds":
      return "Adds exceed configured cap";
    case "risk_exposure_increased":
      return "Total risk exceeds approval";
    case "behavioral_mistake_logged":
      return "Mistake logged";
    case "rapid_post_loss_reactivation":
      return "Re-entry within post-loss window";
    case "oversized_exposure_increase":
      return "Single add exceeds original position";
  }
}

function neutralLabel(update: ActiveTradeUpdate): string {
  switch (update.type) {
    case "move_stop":
      return "Stop adjusted";
    case "move_target":
      return "Target adjusted";
    case "add_position":
      return "Position added";
    case "partial_exit":
      return "Partial exit logged";
    case "mark_mistake":
      return "Mistake logged";
    case "log_exit":
      return "Trade exit logged";
  }
}

function neutralDescription(update: ActiveTradeUpdate): string {
  switch (update.type) {
    case "move_stop":
      return `Stop set to ${update.newStopPrice}.`;
    case "move_target":
      return `Target set to ${update.newTargetPrice}.`;
    case "add_position":
      return `${update.additionalSize} added at ${update.addedAtPrice}.`;
    case "partial_exit":
      return `${update.sizeReduced} reduced at ${update.exitPrice}.`;
    case "mark_mistake":
      return "Trader flagged this trade for review.";
    case "log_exit":
      return `Closed at ${update.exitPrice} (${update.outcome}).`;
  }
}
