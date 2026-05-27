// UI-level sub-shapes consumed by the Rules & Risk section components. The
// canonical record is `RiskRules` in @/types — the workspace
// projects that flat shape into these nested views and merges patches back
// on save, so section component props stay stable across storage changes.

export type AccountType = "Cash" | "Margin" | "Futures" | "Crypto";
export type AccountCurrency = "USD" | "EUR" | "GBP" | "CAD";
export type WarningLevel = "soft" | "standard" | "strict" | "hard_lock";

export type AccountSettings = {
  accountSize: number;
  baseRiskPerTradePercent: number;
  maxDollarRiskPerTrade: number;
  accountType: AccountType;
  currency: AccountCurrency;
};

export type PerTradeRules = {
  requireStopLoss: boolean;
  minRewardRiskRatio: number;
  maxPositionSize: number;
  maxAddsPerTrade: number;
  noAveragingDown: boolean;
  maxOpenPositions: number;
  setupMustBeApproved: boolean;
};

export type DailyProtectionRules = {
  maxDailyLossPercent: number;
  maxDailyTrades: number;
  maxRedTrades: number;
  maxConsecutiveLosses: number;
  cooldownAfterLossMinutes: number;
  lockoutAfterMaxLoss: boolean;
};

export type BehaviorRules = {
  noRevengeTrading: boolean;
  noTradingAfterEmotionalWarning: boolean;
  noReentryWithinMinutes: number;
  noTradesOutsideAllowedSetups: boolean;
  noOvertrading: boolean;
};

export type InterventionPreferences = {
  warningLevel: WarningLevel;
  requireConfirmationBeforeOverride: boolean;
  reflectionPromptAfterOverride: boolean;
};
