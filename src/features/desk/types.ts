// Desk-local convenience aliases — canonical shapes live in @/types.
// New callers should prefer importing from @/types directly.
export type {
  MarketType,
  TradeDirection as Direction,
  TradeInput,
  SessionMetrics as SessionState,
  RiskCalculationResult,
  RuleResult,
  RuleResult as RuleCheckResult,
  RuleStatus,
} from "@/types";

export type DeskMode = "manual" | "broker";
