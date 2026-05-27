import { z } from "zod";

import {
  BEHAVIOR_EVENT_TYPES,
  type BehaviorEventType,
} from "@/lib/behavior-events";
import { TRADE_DIRECTIONS } from "@/types/risk";

// Canonical analytical record for every meaningful trader action. Trade Desk
// emits these; Journal, Reports, and Behavior Analytics consume them. The
// event-type vocabulary lives in @/lib/behavior-events so display strings
// can be polished without breaking persisted records.

export const BEHAVIOR_EVENT_SOURCES = [
  "trade_desk",
  "rules_risk",
  "journal",
  "system",
] as const;
export type BehaviorEventSource = (typeof BEHAVIOR_EVENT_SOURCES)[number];

export const BEHAVIOR_EVENT_DECISIONS = [
  "approved",
  "cancel_trade",
  "revise_trade",
  "continue_anyway",
] as const;
export type BehaviorEventDecision = (typeof BEHAVIOR_EVENT_DECISIONS)[number];

export const BEHAVIOR_EVENT_SEVERITIES = [
  "info",
  "warning",
  "fail",
] as const;
export type BehaviorEventSeverity = (typeof BEHAVIOR_EVENT_SEVERITIES)[number];

const behaviorEventTypeValues = Object.values(BEHAVIOR_EVENT_TYPES) as [
  BehaviorEventType,
  ...BehaviorEventType[],
];

// Narrowed warning/fail subset persisted on each event so consumers can
// summarize triggers without re-running validation.
export const triggeredRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["warning", "fail"]),
  message: z.string().optional(),
});
export type TriggeredRule = z.infer<typeof triggeredRuleSchema>;

export const behaviorEventSchema = z.object({
  id: z.string(),
  eventType: z.enum(behaviorEventTypeValues),
  // Display strings cached on the event so feed/journal consumers don't
  // need to re-resolve through the display registry.
  displayTitle: z.string(),
  displayDescription: z.string(),
  timestamp: z.string(),
  source: z.enum(BEHAVIOR_EVENT_SOURCES),
  symbol: z.string().optional(),
  setupType: z.string().optional(),
  direction: z.enum(TRADE_DIRECTIONS).optional(),
  decision: z.enum(BEHAVIOR_EVENT_DECISIONS).optional(),
  severity: z.enum(BEHAVIOR_EVENT_SEVERITIES),
  triggeredRules: z.array(triggeredRuleSchema),
  totalRisk: z.number().nullable(),
  accountRiskPercent: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Session scope. Optional because legacy records persisted before the
  // session-boundary system don't have them; events without a sessionId
  // are treated as historical and filtered out of current-session views.
  sessionId: z.string().optional(),
  tradingDate: z.string().optional(),
});
export type BehaviorEvent = z.infer<typeof behaviorEventSchema>;
