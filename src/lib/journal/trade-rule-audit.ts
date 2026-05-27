import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import type {
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  RiskRules,
} from "@/types";

// =============================================================================
// Per-trade rule adherence audit
// =============================================================================
//
// Produces a structured list of "did the trader honor each rule?"
// checks for a single closed trade. Designed to feel like a behavioral
// audit, not a spreadsheet — each check has a status + a short detail
// explaining what was observed.
//
// Statuses:
//   * pass         — rule was honored
//   * fail         — rule was broken (observed event evidence)
//   * caution      — rule was technically honored but with caveats
//   * unavailable  — data needed to evaluate this rule isn't present
// =============================================================================

export const AUDIT_CHECK_IDS = [
  "setup_allowed",
  "risk_within_limit",
  "stop_respected",
  "warning_respected",
  "plan_followed",
  "position_size_respected",
  "exit_followed_plan",
] as const;
export type AuditCheckId = (typeof AUDIT_CHECK_IDS)[number];

export type AuditCheckStatus = "pass" | "fail" | "caution" | "unavailable";

export type AuditCheck = {
  id: AuditCheckId;
  label: string;
  status: AuditCheckStatus;
  detail: string;
};

export type RuleAuditResult = {
  checks: AuditCheck[];
  // Convenience aggregates for the section header.
  passCount: number;
  failCount: number;
  cautionCount: number;
};

const LABEL: Record<AuditCheckId, string> = {
  setup_allowed: "Setup allowed",
  risk_within_limit: "Risk within limit",
  stop_respected: "Stop respected",
  warning_respected: "Warning respected",
  plan_followed: "Plan followed",
  position_size_respected: "Position size respected",
  exit_followed_plan: "Exit followed plan",
};

// -----------------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------------
export function auditTrade(
  trade: ClosedTrade,
  events: BehaviorEvent[],
  interventions: InterventionEvent[],
  riskRules: RiskRules,
): RuleAuditResult {
  const checks: AuditCheck[] = [];

  // 1. Setup allowed — check `trade.setupType` against
  //    `riskRules.allowedSetups`. If the trader didn't tag a setup,
  //    treat as unavailable rather than fail.
  if (!trade.setupType || trade.setupType.trim().length === 0) {
    checks.push({
      id: "setup_allowed",
      label: LABEL.setup_allowed,
      status: "unavailable",
      detail: "No setup type tagged on this trade.",
    });
  } else if (
    Array.isArray(riskRules.allowedSetups) &&
    riskRules.allowedSetups.length > 0 &&
    !riskRules.allowedSetups.includes(trade.setupType)
  ) {
    checks.push({
      id: "setup_allowed",
      label: LABEL.setup_allowed,
      status: "fail",
      detail: `Setup "${trade.setupType}" is outside your approved list.`,
    });
  } else {
    checks.push({
      id: "setup_allowed",
      label: LABEL.setup_allowed,
      status: "pass",
      detail: `${trade.setupType} matched your approved setups.`,
    });
  }

  // 2. Risk within limit — compare originalRisk to riskRules cap.
  if (trade.originalRisk == null || !Number.isFinite(trade.originalRisk)) {
    checks.push({
      id: "risk_within_limit",
      label: LABEL.risk_within_limit,
      status: "unavailable",
      detail: "Original risk wasn't computable (override entry with no stop).",
    });
  } else if (
    riskRules.maxDollarRiskPerTrade > 0 &&
    trade.originalRisk > riskRules.maxDollarRiskPerTrade
  ) {
    checks.push({
      id: "risk_within_limit",
      label: LABEL.risk_within_limit,
      status: "fail",
      detail: `Original risk $${trade.originalRisk.toFixed(2)} exceeded the configured cap of $${riskRules.maxDollarRiskPerTrade.toFixed(2)}.`,
    });
  } else {
    checks.push({
      id: "risk_within_limit",
      label: LABEL.risk_within_limit,
      status: "pass",
      detail: `Original risk was $${trade.originalRisk.toFixed(2)}, within the configured cap.`,
    });
  }

  // 3. Stop respected — any STOP_MOVED_FURTHER event for this trade
  //    is a fail.
  const widenings = events.filter(
    (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
  ).length;
  if (widenings === 0) {
    checks.push({
      id: "stop_respected",
      label: LABEL.stop_respected,
      status: "pass",
      detail: "Original invalidation level was not extended.",
    });
  } else {
    checks.push({
      id: "stop_respected",
      label: LABEL.stop_respected,
      status: "fail",
      detail: `Stop was widened ${widenings} time${widenings === 1 ? "" : "s"} during the trade.`,
    });
  }

  // 4. Warning respected — any WARNING_IGNORED, TRADE_OVERRIDE_ACCEPTED,
  //    or continue_anyway intervention is a fail.
  const overrides =
    events.filter(
      (e) =>
        e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
        e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
    ).length +
    interventions.filter((i) => i.decision === "continue_anyway").length;
  if (overrides === 0) {
    checks.push({
      id: "warning_respected",
      label: LABEL.warning_respected,
      status: "pass",
      detail: "No warning overrides observed for this trade.",
    });
  } else {
    checks.push({
      id: "warning_respected",
      label: LABEL.warning_respected,
      status: "fail",
      detail: `${overrides} warning override${overrides === 1 ? "" : "s"} recorded against this trade.`,
    });
  }

  // 5. Plan followed — zero deviations + zero mistakes = pass.
  if (trade.deviationCount === 0 && trade.mistakeCount === 0) {
    checks.push({
      id: "plan_followed",
      label: LABEL.plan_followed,
      status: "pass",
      detail: "No deviations or mistakes recorded.",
    });
  } else {
    const parts: string[] = [];
    if (trade.deviationCount > 0)
      parts.push(
        `${trade.deviationCount} deviation${trade.deviationCount === 1 ? "" : "s"}`,
      );
    if (trade.mistakeCount > 0)
      parts.push(
        `${trade.mistakeCount} mistake${trade.mistakeCount === 1 ? "" : "s"} flagged`,
      );
    checks.push({
      id: "plan_followed",
      label: LABEL.plan_followed,
      status: "fail",
      detail: parts.join(" · "),
    });
  }

  // 6. Position size respected — compare to riskRules.maxPositionSize.
  if (
    riskRules.maxPositionSize > 0 &&
    trade.positionSize > riskRules.maxPositionSize
  ) {
    checks.push({
      id: "position_size_respected",
      label: LABEL.position_size_respected,
      status: "fail",
      detail: `Position size ${trade.positionSize} exceeded the cap of ${riskRules.maxPositionSize}.`,
    });
  } else {
    const sizeIncreases = events.filter(
      (e) =>
        e.eventType === BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED ||
        e.eventType === BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED,
    ).length;
    if (sizeIncreases > 0) {
      checks.push({
        id: "position_size_respected",
        label: LABEL.position_size_respected,
        status: "caution",
        detail: `Size cap honored, but ${sizeIncreases} mid-trade size increase${sizeIncreases === 1 ? "" : "s"} were logged.`,
      });
    } else {
      checks.push({
        id: "position_size_respected",
        label: LABEL.position_size_respected,
        status: "pass",
        detail: `${trade.positionSize} held within configured limits.`,
      });
    }
  }

  // 7. Exit followed plan — approximation. Clean exit at plan = win/be
  //    with zero deviations + no late stop widen. Loss = pass if no
  //    stop widen (trader took the loss as planned). Otherwise caution.
  if (trade.outcome === "win" || trade.outcome === "breakeven") {
    if (trade.deviationCount === 0) {
      checks.push({
        id: "exit_followed_plan",
        label: LABEL.exit_followed_plan,
        status: "pass",
        detail: "Exit reached the planned outcome with no deviations.",
      });
    } else {
      checks.push({
        id: "exit_followed_plan",
        label: LABEL.exit_followed_plan,
        status: "caution",
        detail: "Profitable outcome, but deviations occurred along the way.",
      });
    }
  } else if (trade.outcome === "loss") {
    if (widenings === 0) {
      checks.push({
        id: "exit_followed_plan",
        label: LABEL.exit_followed_plan,
        status: "pass",
        detail: "Loss was taken at the original invalidation — exit honored.",
      });
    } else {
      checks.push({
        id: "exit_followed_plan",
        label: LABEL.exit_followed_plan,
        status: "fail",
        detail: "Loss occurred after stop discipline degraded mid-trade.",
      });
    }
  }

  let passCount = 0;
  let failCount = 0;
  let cautionCount = 0;
  for (const c of checks) {
    if (c.status === "pass") passCount += 1;
    else if (c.status === "fail") failCount += 1;
    else if (c.status === "caution") cautionCount += 1;
  }
  return { checks, passCount, failCount, cautionCount };
}
