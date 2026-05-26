import type {
  BehaviorEvent,
  RiskCalculationResult,
  RiskRules,
  RuleResult,
  RuleStatus,
  SessionMetrics,
  TradeInput,
  TriggeredRule,
  ValidationResult,
} from "@/types";

// Centralized StandFast trade validation engine. Every consumer (Trade Desk
// today, Journal/Reports/Behavior Analytics later) should call `validateTrade`
// instead of re-implementing checks. StandFast does NOT execute trades — the
// engine determines whether a setup "can receive StandFast approval", which
// gates the in-app approval flow. Wording avoids "blocked"/"rejected"/
// "stopped" because the trader is always free to act at their broker.
//
// Types live in @/types — this file consumes them and exports only the
// callable surface (`validateTrade`, `UNCHECKED_RULES`).

// Stable rule IDs — persisted to the behavior event log via triggeredRules,
// so renaming any of these would break analytics. Add new IDs, don't rename.
const RULE_IDS = {
  stopEntered: "stop-entered",
  planWritten: "plan-written",
  setupApproved: "setup-approved",
  riskLimit: "risk-limit",
  dailyLoss: "daily-loss",
  dailyTradeCount: "daily-trade-count",
  redTrades: "red-trades",
  consecutiveLosses: "consecutive-losses",
  cooldown: "cooldown",
  rewardRisk: "reward-risk",
} as const;

const RULE_DEFINITIONS: Array<{ id: string; label: string }> = [
  { id: RULE_IDS.stopEntered, label: "Stop loss entered" },
  { id: RULE_IDS.planWritten, label: "Trade plan written" },
  { id: RULE_IDS.setupApproved, label: "Setup is approved" },
  { id: RULE_IDS.riskLimit, label: "Risk within per-trade limit" },
  { id: RULE_IDS.dailyLoss, label: "Daily loss limit not reached" },
  { id: RULE_IDS.dailyTradeCount, label: "Daily trade count within limit" },
  { id: RULE_IDS.redTrades, label: "Max red trades not reached" },
  { id: RULE_IDS.consecutiveLosses, label: "Max consecutive losses not reached" },
  { id: RULE_IDS.cooldown, label: "Re-entry cooldown clear" },
  { id: RULE_IDS.rewardRisk, label: "Reward:risk meets minimum requirement" },
];

// Placeholder set for pre-check UI state — never persisted, never validated.
export const UNCHECKED_RULES: RuleResult[] = RULE_DEFINITIONS.map((r) => ({
  ...r,
  status: "not-checked",
}));

const EMPTY_RISK: RiskCalculationResult = {
  riskPerShare: null,
  totalRisk: null,
  estimatedReward: null,
  rewardRiskRatio: null,
  accountRiskPercent: null,
  projectedDailyRiskPercent: null,
};

export function parsePrice(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Manual-mode, stocks-style risk calculation. Per-market handlers (options,
// futures, forex, crypto) will branch on `tradeInput.marketType` here once
// those flows are wired up.
function calculateRisk(
  tradeInput: TradeInput,
  riskRules: RiskRules,
  sessionMetrics: SessionMetrics,
): RiskCalculationResult {
  const { positionSize, direction } = tradeInput;
  const entryPrice = parsePrice(tradeInput.entryPrice);
  const stopPrice = parsePrice(tradeInput.stopPrice);
  const targetPrice = parsePrice(tradeInput.targetPrice);

  if (entryPrice == null || stopPrice == null || positionSize == null) {
    return EMPTY_RISK;
  }

  const riskPerShare =
    direction === "Long" ? entryPrice - stopPrice : stopPrice - entryPrice;
  const totalRisk = riskPerShare * positionSize;

  let estimatedReward: number | null = null;
  let rewardRiskRatio: number | null = null;
  if (targetPrice != null) {
    const rewardPerShare =
      direction === "Long"
        ? targetPrice - entryPrice
        : entryPrice - targetPrice;
    estimatedReward = rewardPerShare * positionSize;
    rewardRiskRatio = riskPerShare > 0 ? rewardPerShare / riskPerShare : null;
  }

  const accountRiskPercent =
    riskRules.accountSize > 0
      ? (totalRisk / riskRules.accountSize) * 100
      : null;

  const projectedDailyRiskPercent =
    accountRiskPercent != null
      ? sessionMetrics.dailyLossUsedPercent + Math.max(0, accountRiskPercent)
      : null;

  return {
    riskPerShare,
    totalRisk,
    estimatedReward,
    rewardRiskRatio,
    accountRiskPercent,
    projectedDailyRiskPercent,
  };
}

export type ValidateTradeArgs = {
  tradeInput: TradeInput;
  riskRules: RiskRules;
  sessionMetrics: SessionMetrics;
  // Accepted for future analytics-aware checks (e.g. derived red-trade /
  // consecutive-loss counts from TRADE_EXITED metadata). Today the engine
  // treats sessionMetrics as authoritative for those counters.
  behaviorEvents: BehaviorEvent[];
};

export function validateTrade(args: ValidateTradeArgs): ValidationResult {
  const { tradeInput, riskRules, sessionMetrics } = args;
  const risk = calculateRisk(tradeInput, riskRules, sessionMetrics);

  const stopMissing = parsePrice(tradeInput.stopPrice) == null;
  const planLength = tradeInput.tradePlan.trim().length;
  const planEmpty = planLength === 0;
  const setupSelected = tradeInput.setupType.length > 0;
  const setupInList = riskRules.allowedSetups.includes(tradeInput.setupType);

  // Labels are status-dependent on purpose — when a rule is passing, the
  // positive framing ("Stop loss entered") reads as confirmation; when it's
  // warning/failing, the title describes the *actual* condition ("Stop loss
  // missing") so the trader is never confused by an inverted heading next
  // to a fail status. Wording is concise, behavioral, and non-emotional.

  const ruleResults: RuleResult[] = [
    // 1. Stop loss
    {
      id: RULE_IDS.stopEntered,
      label: stopMissing ? "Stop loss missing" : "Stop loss entered",
      status: stopMissing
        ? riskRules.requireStopLoss
          ? "fail"
          : "warning"
        : "pass",
      message: stopMissing ? "No stop price set" : undefined,
      recommendedAction: stopMissing
        ? "Enter a stop price before requesting StandFast approval"
        : undefined,
    },

    // 2. Trade plan
    {
      id: RULE_IDS.planWritten,
      label: planEmpty
        ? "Trade plan missing"
        : planLength < 20
          ? "Trade plan insufficient"
          : "Trade plan written",
      status: planEmpty
        ? "fail"
        : planLength < 20
          ? "warning"
          : "pass",
      message: planEmpty
        ? "Write your reason for taking this trade"
        : planLength < 20
          ? "Plan is short — add more detail"
          : undefined,
      recommendedAction: planEmpty
        ? "Write the setup, the trigger, and what would invalidate the trade"
        : planLength < 20
          ? "Expand your plan so future-you can audit the decision"
          : undefined,
    },

    // 3. Setup approval (honors `setupMustBeApproved` toggle)
    {
      id: RULE_IDS.setupApproved,
      label: !setupSelected
        ? "Setup not selected"
        : !setupInList && riskRules.setupMustBeApproved
          ? "Setup not in approved list"
          : "Setup is approved",
      status: !setupSelected
        ? riskRules.setupMustBeApproved
          ? "fail"
          : "warning"
        : setupInList
          ? "pass"
          : riskRules.setupMustBeApproved
            ? "warning"
            : "pass",
      message: !setupSelected
        ? "No setup selected"
        : !setupInList && riskRules.setupMustBeApproved
          ? `"${tradeInput.setupType}" is not in your pre-approved list`
          : undefined,
      recommendedAction:
        !setupInList && setupSelected && riskRules.setupMustBeApproved
          ? `Pick one of: ${riskRules.allowedSetups.join(", ")}`
          : !setupSelected && riskRules.setupMustBeApproved
            ? "Select an approved setup before requesting StandFast approval"
            : undefined,
    },

    // 4. Per-trade risk
    {
      id: RULE_IDS.riskLimit,
      label:
        risk.accountRiskPercent == null
          ? "Per-trade risk pending complete inputs"
          : risk.accountRiskPercent > riskRules.baseRiskPerTradePercent
            ? "Per-trade risk exceeds limit"
            : "Risk within per-trade limit",
      status:
        risk.accountRiskPercent == null
          ? "warning"
          : risk.accountRiskPercent <= riskRules.baseRiskPerTradePercent
            ? "pass"
            : "fail",
      message:
        risk.accountRiskPercent == null
          ? "Risk cannot be calculated until entry, stop, and position size are complete."
          : risk.accountRiskPercent > riskRules.baseRiskPerTradePercent
            ? `Trade risks ${risk.accountRiskPercent.toFixed(2)}% of account (limit ${riskRules.baseRiskPerTradePercent.toFixed(2)}%)`
            : undefined,
      recommendedAction:
        risk.accountRiskPercent == null
          ? "Complete entry, stop, and position size before re-checking"
          : risk.accountRiskPercent > riskRules.baseRiskPerTradePercent
            ? "Reduce position size or tighten stop to stay within your per-trade limit"
            : undefined,
    },

    // 5. Daily loss budget
    {
      id: RULE_IDS.dailyLoss,
      label: sessionMetrics.dailyLossLimitBreached
        ? "Daily loss limit reached"
        : risk.projectedDailyRiskPercent != null &&
            risk.projectedDailyRiskPercent > riskRules.maxDailyLossPercent
          ? "Projected daily loss exceeds limit"
          : "Daily loss limit not reached",
      status: sessionMetrics.dailyLossLimitBreached
        ? "fail"
        : risk.projectedDailyRiskPercent != null &&
            risk.projectedDailyRiskPercent > riskRules.maxDailyLossPercent
          ? "warning"
          : "pass",
      message: sessionMetrics.dailyLossLimitBreached
        ? "Daily loss limit reached — new trades cannot receive StandFast approval"
        : risk.projectedDailyRiskPercent != null &&
            risk.projectedDailyRiskPercent > riskRules.maxDailyLossPercent
          ? `This trade would push daily risk to ${risk.projectedDailyRiskPercent.toFixed(2)}% (limit ${riskRules.maxDailyLossPercent.toFixed(2)}%)`
          : undefined,
      recommendedAction: sessionMetrics.dailyLossLimitBreached
        ? "Session loss cap reached — step away and review before re-engaging"
        : risk.projectedDailyRiskPercent != null &&
            risk.projectedDailyRiskPercent > riskRules.maxDailyLossPercent
          ? "Reduce size so projected daily risk stays under your limit"
          : undefined,
    },

    // 6. Daily trade count
    {
      id: RULE_IDS.dailyTradeCount,
      label:
        sessionMetrics.tradesTakenToday >= riskRules.maxDailyTrades
          ? "Daily trade limit reached"
          : sessionMetrics.tradesTakenToday >= riskRules.maxDailyTrades - 1
            ? "Approaching daily trade limit"
            : "Daily trade count within limit",
      status:
        sessionMetrics.tradesTakenToday >= riskRules.maxDailyTrades
          ? "fail"
          : sessionMetrics.tradesTakenToday >= riskRules.maxDailyTrades - 1
            ? "warning"
            : "pass",
      message:
        sessionMetrics.tradesTakenToday >= riskRules.maxDailyTrades
          ? `Daily trade limit reached (${sessionMetrics.tradesTakenToday}/${riskRules.maxDailyTrades})`
          : `${sessionMetrics.tradesTakenToday}/${riskRules.maxDailyTrades} trades taken`,
      recommendedAction:
        sessionMetrics.tradesTakenToday >= riskRules.maxDailyTrades
          ? "Daily trade limit reached — new trades require review"
          : sessionMetrics.tradesTakenToday >= riskRules.maxDailyTrades - 1
            ? "Be selective — this is your final trade of the day"
            : undefined,
    },

    // 7. Red-trade cap
    {
      id: RULE_IDS.redTrades,
      label:
        sessionMetrics.redTradesToday >= riskRules.maxRedTrades
          ? "Red-trade limit reached"
          : sessionMetrics.redTradesToday >= riskRules.maxRedTrades - 1
            ? "Approaching red-trade limit"
            : "Red-trade count within limit",
      status:
        sessionMetrics.redTradesToday >= riskRules.maxRedTrades
          ? "fail"
          : sessionMetrics.redTradesToday >= riskRules.maxRedTrades - 1
            ? "warning"
            : "pass",
      message:
        sessionMetrics.redTradesToday >= riskRules.maxRedTrades
          ? `Red-trade cap reached (${sessionMetrics.redTradesToday}/${riskRules.maxRedTrades})`
          : `${sessionMetrics.redTradesToday}/${riskRules.maxRedTrades} losing trades today`,
      recommendedAction:
        sessionMetrics.redTradesToday >= riskRules.maxRedTrades
          ? "Red-trade cap reached — new trades cannot receive StandFast approval"
          : sessionMetrics.redTradesToday >= riskRules.maxRedTrades - 1
            ? "One more losing trade hits your daily red cap — slow down"
            : undefined,
    },

    // 8. Consecutive-loss streak
    {
      id: RULE_IDS.consecutiveLosses,
      label:
        sessionMetrics.consecutiveLosses >= riskRules.maxConsecutiveLosses
          ? "Consecutive-loss limit reached"
          : sessionMetrics.consecutiveLosses >= riskRules.maxConsecutiveLosses - 1
            ? "Approaching consecutive-loss limit"
            : "Consecutive-loss count within limit",
      status:
        sessionMetrics.consecutiveLosses >= riskRules.maxConsecutiveLosses
          ? "fail"
          : sessionMetrics.consecutiveLosses >= riskRules.maxConsecutiveLosses - 1
            ? "warning"
            : "pass",
      message:
        sessionMetrics.consecutiveLosses >= riskRules.maxConsecutiveLosses
          ? `Consecutive-loss streak hit (${sessionMetrics.consecutiveLosses}/${riskRules.maxConsecutiveLosses})`
          : sessionMetrics.consecutiveLosses > 0
            ? `${sessionMetrics.consecutiveLosses} losing trade${sessionMetrics.consecutiveLosses === 1 ? "" : "s"} in a row`
            : undefined,
      recommendedAction:
        sessionMetrics.consecutiveLosses >= riskRules.maxConsecutiveLosses
          ? "Streak triggers elevated warning — step back before continuing"
          : sessionMetrics.consecutiveLosses >= riskRules.maxConsecutiveLosses - 1
            ? "One more loss completes the streak — reflect before re-entering"
            : undefined,
    },

    // 9. Re-entry cooldown
    {
      id: RULE_IDS.cooldown,
      label: sessionMetrics.cooldownActive
        ? "Re-entry cooldown active"
        : "Re-entry cooldown clear",
      status: sessionMetrics.cooldownActive ? "fail" : "pass",
      message: sessionMetrics.cooldownActive
        ? `Re-entry cooldown active (${riskRules.noReentryWithinMinutes} min)`
        : undefined,
      recommendedAction: sessionMetrics.cooldownActive
        ? `Wait until your ${riskRules.noReentryWithinMinutes}-minute cooldown clears`
        : undefined,
    },

    // 10. Reward:risk ratio
    //   - pass if no target price yet (neutral, not a violation)
    //   - warning if below user's `minimumRewardRisk`
    {
      id: RULE_IDS.rewardRisk,
      label:
        risk.rewardRiskRatio != null &&
        risk.rewardRiskRatio < riskRules.minimumRewardRisk
          ? "Reward:risk below minimum"
          : "Reward:risk meets minimum requirement",
      status:
        risk.rewardRiskRatio == null
          ? "pass"
          : risk.rewardRiskRatio >= riskRules.minimumRewardRisk
            ? "pass"
            : "warning",
      message:
        risk.rewardRiskRatio != null &&
        risk.rewardRiskRatio < riskRules.minimumRewardRisk
          ? `Reward:risk is ${risk.rewardRiskRatio.toFixed(2)} : 1 (minimum ${riskRules.minimumRewardRisk.toFixed(2)} : 1)`
          : undefined,
      recommendedAction:
        risk.rewardRiskRatio != null &&
        risk.rewardRiskRatio < riskRules.minimumRewardRisk
          ? "Extend target or tighten stop until reward:risk meets your minimum"
          : undefined,
    },
  ];

  const triggeredRules: TriggeredRule[] = ruleResults
    .filter((r) => r.status === "warning" || r.status === "fail")
    .map((r) => ({
      id: r.id,
      label: r.label,
      status: r.status as "warning" | "fail",
      message: r.message,
    }));

  const hasFail = triggeredRules.some((r) => r.status === "fail");
  const hasWarning = triggeredRules.some((r) => r.status === "warning");

  const validationStatus: ValidationResult["validationStatus"] = hasFail
    ? "violation"
    : hasWarning
      ? "warning"
      : "approved";

  // Surface the single most actionable next step. Fails outrank warnings, and
  // each rule contributes its own `recommendedAction` — first match wins so
  // the trader sees the most severe issue first.
  const recommendation =
    [...ruleResults]
      .sort((a, b) => severityWeight(b.status) - severityWeight(a.status))
      .find((r) => r.recommendedAction)?.recommendedAction ?? null;

  const canReceiveStandFastApproval = validationStatus === "approved";

  return {
    validationStatus,
    canReceiveStandFastApproval,
    ruleResults,
    triggeredRules,
    recommendation,
    riskCalculation: risk,
    timestamp: new Date().toISOString(),
  };
}

function severityWeight(status: RuleStatus): number {
  switch (status) {
    case "fail":
      return 3;
    case "warning":
      return 2;
    case "pass":
      return 1;
    case "not-checked":
      return 0;
  }
}
