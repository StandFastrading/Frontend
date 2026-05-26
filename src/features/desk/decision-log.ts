import { BEHAVIOR_EVENT_DISPLAY } from "@/lib/behavior-events";
import type { BehaviorEventType } from "@/lib/behavior-events";
import type {
  BehaviorEvent,
  BehaviorEventDecision,
  BehaviorEventSeverity,
  RiskCalculationResult,
  RuleResult,
  TradeInput,
  TriggeredRule,
} from "@/types";

// Builder that turns a Trade Desk action into the canonical `BehaviorEvent`
// consumed by the centralized store. `eventType` is the behavioral
// classification (what happened); `decision` is the UI action that produced
// it. Persisting both lets Journal/Reports group by intent OR by literal
// button press.

function nextId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buildBehaviorEvent(args: {
  input: TradeInput;
  results: RuleResult[];
  risk: RiskCalculationResult;
  eventType: BehaviorEventType;
  decision?: BehaviorEventDecision;
}): BehaviorEvent {
  const { input, results, risk, eventType, decision } = args;

  const triggeredRules: TriggeredRule[] = results
    .filter((r) => r.status === "warning" || r.status === "fail")
    .map((r) => ({
      id: r.id,
      label: r.label,
      status: r.status as "warning" | "fail",
      message: r.message,
    }));

  const severity: BehaviorEventSeverity = triggeredRules.some(
    (r) => r.status === "fail",
  )
    ? "fail"
    : triggeredRules.length > 0
      ? "warning"
      : "info";

  const display = BEHAVIOR_EVENT_DISPLAY[eventType];

  return {
    id: nextId(),
    eventType,
    displayTitle: display.displayTitle,
    displayDescription: display.displayDescription,
    timestamp: new Date().toISOString(),
    source: "trade_desk",
    symbol: input.symbol || undefined,
    setupType: input.setupType || undefined,
    direction: input.direction,
    decision,
    severity,
    triggeredRules,
    totalRisk: risk.totalRisk,
    accountRiskPercent: risk.accountRiskPercent,
    metadata: {
      entryPrice: input.entryPrice,
      stopPrice: input.stopPrice,
      positionSize: input.positionSize,
    },
  };
}
