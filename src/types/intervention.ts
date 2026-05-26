import { z } from "zod";

import { triggeredRuleSchema } from "@/types/behavior-event";
import { MARKET_TYPES, TRADE_DIRECTIONS } from "@/types/risk";
import { VALIDATION_SEVERITIES } from "@/types/validation";

// `InterventionEvent` is the structured decision record produced every time
// the trader resolves the rule-check modal (Cancel / Revise / Continue
// Anyway). Lives in the centralized behavior pipeline alongside
// `BehaviorEvent`, but the rich, flat shape here is what Reports / Journal /
// Behavior Analytics will key off — every spec field is captured at write
// time so future surfaces never have to re-derive it.
//
// The corresponding `BehaviorEvent` (TRADE_AVOIDED / TRADE_REVISED /
// WARNING_IGNORED / TRADE_OVERRIDE_ACCEPTED) is still emitted for the live
// feed; the two streams complement each other.

// Decision label — what the trader chose in the modal.
export const INTERVENTION_DECISIONS = [
  "continue_anyway",
  "revise_trade",
  "cancel_trade",
] as const;
export type InterventionDecision = (typeof INTERVENTION_DECISIONS)[number];

// Severity of the rule check the modal was reacting to.
export const INTERVENTION_SEVERITIES = ["warning", "violation"] as const;
export type InterventionSeverity = (typeof INTERVENTION_SEVERITIES)[number];

// Event-type vocabulary persisted on the decision record. One-to-one with
// `InterventionDecision` but stored explicitly per spec so downstream
// queries can filter on a stable wire identifier without inferring it from
// the decision field.
export const INTERVENTION_EVENT_TYPES = {
  CANCEL_TRADE: "intervention_cancel_trade",
  REVISE_TRADE: "intervention_revise_trade",
  CONTINUE_ANYWAY: "intervention_continue_anyway",
} as const;
export type InterventionEventType =
  (typeof INTERVENTION_EVENT_TYPES)[keyof typeof INTERVENTION_EVENT_TYPES];

// Source tag — every decision recorded on the Trade Desk gets this value.
// Future surfaces that also emit intervention records (e.g., Journal
// override flow) will use a different source.
export const INTERVENTION_SOURCES = ["trade_desk_intervention"] as const;
export type InterventionSource = (typeof INTERVENTION_SOURCES)[number];

// Maps a decision to the matching event-type wire value.
export function eventTypeFromDecision(
  decision: InterventionDecision,
): InterventionEventType {
  switch (decision) {
    case "cancel_trade":
      return INTERVENTION_EVENT_TYPES.CANCEL_TRADE;
    case "revise_trade":
      return INTERVENTION_EVENT_TYPES.REVISE_TRADE;
    case "continue_anyway":
      return INTERVENTION_EVENT_TYPES.CONTINUE_ANYWAY;
  }
}

export const interventionEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  decision: z.enum(INTERVENTION_DECISIONS),
  eventType: z.enum([
    INTERVENTION_EVENT_TYPES.CANCEL_TRADE,
    INTERVENTION_EVENT_TYPES.REVISE_TRADE,
    INTERVENTION_EVENT_TYPES.CONTINUE_ANYWAY,
  ]),
  severity: z.enum(INTERVENTION_SEVERITIES),

  // Trade context — flat per spec. Optional because legacy records persisted
  // before this hardening pass kept this data under `tradeContext` instead.
  symbol: z.string().optional(),
  marketType: z.enum(MARKET_TYPES).optional(),
  direction: z.enum(TRADE_DIRECTIONS).optional(),
  setupType: z.string().optional(),
  entryPrice: z.string().optional(),
  stopPrice: z.string().optional(),
  targetPrice: z.string().optional(),
  positionSize: z.number().nullable().optional(),

  // Account + risk snapshot captured at decision time.
  accountSize: z.number().optional(),
  totalRisk: z.number().nullable().optional(),
  accountRiskPercent: z.number().nullable().optional(),
  rewardRiskRatio: z.number().nullable().optional(),

  // Validation context.
  validationStatus: z.enum(VALIDATION_SEVERITIES).optional(),
  triggeredRules: z.array(triggeredRuleSchema),
  warningCount: z.number().optional(),
  violationCount: z.number().optional(),

  // Provenance.
  source: z.enum(INTERVENTION_SOURCES).optional(),

  // Linked behavior event id — lets consumers hop from this record to the
  // feed entry that mirrored it.
  behaviorEventId: z.string().optional(),

  // Trading-session scope (optional for legacy records — see BehaviorEvent).
  sessionId: z.string().optional(),
  tradingDate: z.string().optional(),

  // Legacy nested shape — kept tolerated by the schema so pre-hardening
  // records still parse. New writes flatten everything onto the top level.
  tradeContext: z
    .object({
      symbol: z.string().optional(),
      setupType: z.string().optional(),
      direction: z.enum(TRADE_DIRECTIONS).optional(),
    })
    .optional(),
});
export type InterventionEvent = z.infer<typeof interventionEventSchema>;

// ---------------------------------------------------------------------------
// Beta metrics utility — pure function so any consumer (Reports, Journal,
// background job, future analytics engine) can compute the same numbers
// from the same data. React surfaces should use `useInterventionMetrics`
// from `@/store/slices/session-intelligence-slice` to memoize the read.
// ---------------------------------------------------------------------------

export type InterventionMetrics = {
  totalInterventionDecisions: number;
  cancelCount: number;
  reviseCount: number;
  continueAnywayCount: number;
  // Rates are 0–100 percentages, rounded for display. Denominator is
  // `totalInterventionDecisions`. When the denominator is zero we return 0
  // (not NaN) so consumers can render the value directly.
  warningIgnoredRate: number;
  revisionRate: number;
  avoidedTradeRate: number;
};

export function computeInterventionMetrics(
  interventions: InterventionEvent[],
): InterventionMetrics {
  const total = interventions.length;
  let cancelCount = 0;
  let reviseCount = 0;
  let continueAnywayCount = 0;
  for (const it of interventions) {
    if (it.decision === "cancel_trade") cancelCount += 1;
    else if (it.decision === "revise_trade") reviseCount += 1;
    else if (it.decision === "continue_anyway") continueAnywayCount += 1;
  }
  const rate = (n: number) =>
    total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
  return {
    totalInterventionDecisions: total,
    cancelCount,
    reviseCount,
    continueAnywayCount,
    warningIgnoredRate: rate(continueAnywayCount),
    revisionRate: rate(reviseCount),
    avoidedTradeRate: rate(cancelCount),
  };
}
