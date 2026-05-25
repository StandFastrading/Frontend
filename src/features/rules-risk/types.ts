// Canonical shape for trader risk configuration. Trade Desk should eventually
// read account size + rule data from here. Persisted to localStorage today;
// designed to round-trip cleanly to a backend record later.

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

export type RiskRulesConfig = {
  account: AccountSettings;
  perTrade: PerTradeRules;
  allowedSetups: string[];
  daily: DailyProtectionRules;
  behavior: BehaviorRules;
  intervention: InterventionPreferences;
  lastUpdated: string | null;
};
