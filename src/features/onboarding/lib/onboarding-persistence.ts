// Shared onboarding → store mapping helpers.
//
// Every onboarding step that persists data routes through here so the ~10 step
// components don't each invent their own field mapping (that divergence is how
// market selection and per-market risk config got silently dropped before).
//
// Design contract:
//   * Core numeric risk values map onto EXISTING RiskRules columns that the
//     Trade Desk + validation engine already read — so futures/forex/etc.
//     testers get correct risk math instead of defaults.
//   * Anything market-specific without a structured column goes into
//     RiskRules.marketConfig (persisted to risk_rules.market_config JSONB).
//   * Behavioral baseline is built into one canonical shape for profiles.

import type { AccountType, RiskRules } from "@/types/risk-rules";
import {
  getDefaultBehavioralBaseline,
  type BehavioralBaseline,
} from "@/types/user-profile";

// --- Behavioral baseline -----------------------------------------------------

// Accepts whatever subset a step collected (base flow → mindset/riskTolerance/
// triggers; per-market flows → behaviors/notes) and fills the rest with
// defaults, so no captured field is dropped and missing ones stay neutral.
export function buildBehavioralBaseline(
  input: Partial<BehavioralBaseline>,
): BehavioralBaseline {
  return { ...getDefaultBehavioralBaseline(), ...input };
}

// --- Per-market risk config --------------------------------------------------

// Canonical risk input. Core fields map to typed RiskRules columns; market
// extras (unit, market-specific caps, raw rule-toggle ids) go to marketConfig.
export type OnboardingRiskInput = {
  accountSize?: number;
  accountType?: AccountType;
  riskPerTradePercent?: number;
  dailyLossPercent?: number;
  maxDailyTrades?: number;
  /** Position-size cap in the market's unit (shares / contracts / lots). */
  maxPositionSize?: number;
  maxOpenPositions?: number;
  maxAddsPerTrade?: number;
  noReentryWithinMinutes?: number;
  cooldownAfterLossMinutes?: number;
  maxConsecutiveLosses?: number;
  /** Merged into RiskRules.marketConfig (e.g. instrumentUnit, marketType,
   *  maxSameDirection, weeklyDrawdownPercent, selectedRuleIds). */
  marketConfig?: Record<string, unknown>;
};

// Returns a new RiskRules with provided fields applied. Only fields present on
// `input` are changed — everything else (incl. allowed setups already saved by
// the setups step) is preserved. marketConfig is shallow-merged, not replaced.
export function applyOnboardingRisk(
  prev: RiskRules,
  input: OnboardingRiskInput,
): RiskRules {
  const next: RiskRules = { ...prev };
  if (input.accountSize !== undefined) next.accountSize = input.accountSize;
  if (input.accountType !== undefined) next.accountType = input.accountType;
  if (input.riskPerTradePercent !== undefined)
    next.baseRiskPerTradePercent = input.riskPerTradePercent;
  if (input.dailyLossPercent !== undefined)
    next.maxDailyLossPercent = input.dailyLossPercent;
  if (input.maxDailyTrades !== undefined)
    next.maxDailyTrades = input.maxDailyTrades;
  if (input.maxPositionSize !== undefined)
    next.maxPositionSize = input.maxPositionSize;
  if (input.maxOpenPositions !== undefined)
    next.maxOpenPositions = input.maxOpenPositions;
  if (input.maxAddsPerTrade !== undefined)
    next.maxAddsPerTrade = input.maxAddsPerTrade;
  if (input.noReentryWithinMinutes !== undefined)
    next.noReentryWithinMinutes = input.noReentryWithinMinutes;
  if (input.cooldownAfterLossMinutes !== undefined)
    next.cooldownAfterLossMinutes = input.cooldownAfterLossMinutes;
  if (input.maxConsecutiveLosses !== undefined)
    next.maxConsecutiveLosses = input.maxConsecutiveLosses;
  if (input.marketConfig !== undefined)
    next.marketConfig = { ...prev.marketConfig, ...input.marketConfig };
  return next;
}
