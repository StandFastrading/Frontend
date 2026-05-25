import { parsePrice } from "@/features/desk/calculate-risk";
import type {
  RiskCalculation,
  RuleCheckResult,
  SessionState,
  TradeInput,
  UserRules,
} from "@/features/desk/types";

const RULE_DEFS: Array<Pick<RuleCheckResult, "id" | "label">> = [
  { id: "stop-entered", label: "Stop loss entered" },
  { id: "plan-written", label: "Trade plan written" },
  { id: "allowed-setup", label: "Allowed setup selected" },
  { id: "risk-limit", label: "Risk within limit" },
  { id: "daily-loss", label: "Daily loss limit not breached" },
  { id: "cooldown", label: "Re-entry cooldown clear" },
  { id: "max-trades", label: "Max trades not exceeded" },
];

export const UNCHECKED_RULES: RuleCheckResult[] = RULE_DEFS.map((r) => ({
  ...r,
  status: "not-checked",
}));

export function checkRules(
  input: TradeInput,
  rules: UserRules,
  session: SessionState,
  risk: RiskCalculation,
): RuleCheckResult[] {
  const planLength = input.tradePlan.trim().length;
  const setupAllowed =
    input.setupType.length > 0 && rules.allowedSetups.includes(input.setupType);

  const stopMissing = parsePrice(input.stopPrice) == null;
  const planEmpty = planLength === 0;

  return [
    {
      id: "stop-entered",
      label: "Stop loss entered",
      status: stopMissing
        ? rules.requireStopLoss
          ? "fail"
          : "warning"
        : "pass",
      message: stopMissing ? "No stop price set" : undefined,
      recommendedAction: stopMissing
        ? "Enter a stop price before taking the trade"
        : undefined,
    },
    {
      id: "plan-written",
      label: "Trade plan written",
      status: planEmpty
        ? rules.requireTradePlan
          ? "fail"
          : "warning"
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
    {
      id: "allowed-setup",
      label: "Allowed setup selected",
      status: setupAllowed
        ? "pass"
        : input.setupType.length > 0
          ? "warning"
          : "fail",
      message:
        input.setupType.length === 0
          ? "No setup selected"
          : !setupAllowed
            ? `"${input.setupType}" is not in your pre-approved list`
            : undefined,
      recommendedAction: !setupAllowed
        ? `Pick one of: ${rules.allowedSetups.join(", ")}`
        : undefined,
    },
    {
      // Only fails when risk is actually calculable and exceeds the cap.
      // Missing inputs are surfaced as a warning, not a fail, because the
      // missing-stop case is already its own dedicated failure.
      id: "risk-limit",
      label: "Risk within limit",
      status:
        risk.percentOfAccountAtRisk == null
          ? "warning"
          : risk.percentOfAccountAtRisk <= rules.maxRiskPerTradePercent
            ? "pass"
            : "fail",
      message:
        risk.percentOfAccountAtRisk == null
          ? "Risk cannot be calculated until entry, stop, and position size are complete."
          : risk.percentOfAccountAtRisk > rules.maxRiskPerTradePercent
            ? `Trade risks ${risk.percentOfAccountAtRisk.toFixed(2)}% of account (limit ${rules.maxRiskPerTradePercent.toFixed(2)}%)`
            : undefined,
      recommendedAction:
        risk.percentOfAccountAtRisk == null
          ? "Complete entry, stop, and position size before re-checking"
          : risk.percentOfAccountAtRisk > rules.maxRiskPerTradePercent
            ? "Reduce position size or tighten stop to stay within your per-trade limit"
            : undefined,
    },
    {
      id: "daily-loss",
      label: "Daily loss limit not breached",
      status: session.dailyLossLimitBreached
        ? "fail"
        : risk.projectedDailyRiskAfterTrade != null &&
            risk.projectedDailyRiskAfterTrade > rules.maxDailyLossPercent
          ? "warning"
          : "pass",
      message: session.dailyLossLimitBreached
        ? "Daily loss limit already hit — no more trades"
        : risk.projectedDailyRiskAfterTrade != null &&
            risk.projectedDailyRiskAfterTrade > rules.maxDailyLossPercent
          ? `This trade would push daily risk to ${risk.projectedDailyRiskAfterTrade.toFixed(2)}% (limit ${rules.maxDailyLossPercent.toFixed(2)}%)`
          : undefined,
      recommendedAction: session.dailyLossLimitBreached
        ? "Stop trading for the session — your daily loss limit is hit"
        : risk.projectedDailyRiskAfterTrade != null &&
            risk.projectedDailyRiskAfterTrade > rules.maxDailyLossPercent
          ? "Reduce size so projected daily risk stays under your limit"
          : undefined,
    },
    {
      id: "cooldown",
      label: "Re-entry cooldown clear",
      status: session.cooldownActive ? "fail" : "pass",
      message: session.cooldownActive
        ? `Cooldown active (${rules.reentryCooldownMinutes} min)`
        : undefined,
      recommendedAction: session.cooldownActive
        ? `Wait until your ${rules.reentryCooldownMinutes}-minute cooldown clears`
        : undefined,
    },
    {
      id: "max-trades",
      label: "Max trades not exceeded",
      status:
        session.tradesTakenToday >= rules.maxTradesPerDay
          ? "fail"
          : session.tradesTakenToday >= rules.maxTradesPerDay - 1
            ? "warning"
            : "pass",
      message:
        session.tradesTakenToday >= rules.maxTradesPerDay
          ? `Max trades reached (${session.tradesTakenToday}/${rules.maxTradesPerDay})`
          : `${session.tradesTakenToday}/${rules.maxTradesPerDay} trades taken`,
      recommendedAction:
        session.tradesTakenToday >= rules.maxTradesPerDay
          ? "Stop trading — you've hit your max trades for the day"
          : session.tradesTakenToday >= rules.maxTradesPerDay - 1
            ? "Be selective — this is your final trade of the day"
            : undefined,
    },
  ];
}
