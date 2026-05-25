import type { BehaviorEventType } from "@/lib/behavior-events";
import type {
  Direction,
  RiskCalculation,
  RuleCheckResult,
  TradeInput,
} from "@/features/desk/types";

// Schema for every modal decision a trader makes on the desk. Designed to be
// stable so it can be persisted to a backend later and consumed by Journal,
// Reports, and Behavior Analytics without restructuring.

// `eventType` is the behavioral classification (what *happened*) — sourced
// from the shared `BehaviorEventType` vocabulary.
// `decision` is the UI action that produced it (which *button* the trader
// pressed). Keeping them separate lets Behavior Analytics group by intent
// while Journal can show the literal action.

export type DecisionAction =
  | "cancel_trade"
  | "revise_trade"
  | "continue_anyway"
  | "approved";

export type DecisionSeverity = "warning" | "fail";

export type TriggeredRule = {
  id: string;
  label: string;
  status: "warning" | "fail";
  message?: string;
};

export type BehaviorEventRecord = {
  timestamp: string;
  symbol: string;
  setupType: string;
  direction: Direction;
  entryPrice: string;
  stopPrice: string;
  positionSize: number | null;
  triggeredRules: TriggeredRule[];
  eventType: BehaviorEventType;
  decision: DecisionAction;
  severity: DecisionSeverity;
  accountRiskPercent: number | null;
  totalRisk: number | null;
  source: "trade_desk";
};

export function buildBehaviorEventRecord(args: {
  input: TradeInput;
  results: RuleCheckResult[];
  risk: RiskCalculation;
  eventType: BehaviorEventType;
  decision: DecisionAction;
}): BehaviorEventRecord {
  const { input, results, risk, eventType, decision } = args;
  const triggered: TriggeredRule[] = results
    .filter((r) => r.status === "warning" || r.status === "fail")
    .map((r) => ({
      id: r.id,
      label: r.label,
      status: r.status as "warning" | "fail",
      message: r.message,
    }));

  const severity: DecisionSeverity = triggered.some((r) => r.status === "fail")
    ? "fail"
    : "warning";

  return {
    timestamp: new Date().toISOString(),
    symbol: input.symbol,
    setupType: input.setupType,
    direction: input.direction,
    entryPrice: input.entryPrice,
    stopPrice: input.stopPrice,
    positionSize: input.positionSize,
    triggeredRules: triggered,
    eventType,
    decision,
    severity,
    accountRiskPercent: risk.percentOfAccountAtRisk,
    totalRisk: risk.totalTradeRisk,
    source: "trade_desk",
  };
}

// Mock storage: localStorage now, backend later. Same read/write API works
// for both, so the swap is a single-file change.
const STORAGE_KEY = "sf_decision_log";

export function loadDecisionLog(): BehaviorEventRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BehaviorEventRecord[]) : [];
  } catch {
    return [];
  }
}

export function appendDecisionLog(record: BehaviorEventRecord): void {
  if (typeof window === "undefined") return;
  try {
    const next = [record, ...loadDecisionLog()];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota or serialization error — non-fatal */
  }
}
