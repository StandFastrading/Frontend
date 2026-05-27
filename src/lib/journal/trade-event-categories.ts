import {
  BEHAVIOR_EVENT_TYPES,
  type BehaviorEventType,
} from "@/lib/behavior-events";
import type {
  BehavioralDeviationType,
  BehaviorEvent,
  MonitoringEvent,
} from "@/types";

// =============================================================================
// Trade event categories
// =============================================================================
//
// The Trade Detail timeline previously used a single chip that conflated
// "phase of the trade" (pre-approval / approval / active / exit) with
// "what kind of behavior is this row?". That produced confusing labels —
// e.g. "Stop widened beyond approved risk" rendering an APPROVAL chip
// because it landed close to the approval anchor.
//
// This module separates the two:
//
//   Category — what KIND of event this is. Stable across the trade.
//              Rendered as the chip on each timeline row.
//   Severity — how serious it is. Rendered separately (icon ring, dot,
//              optional severity label).
//
// Categories are deliberately small (~8) and reflect the behavioral
// vocabulary the trader needs to scan quickly. Both behavior events,
// monitoring deviations, and interventions resolve to a category through
// the helpers below — callers don't need to memorize per-event-type
// mappings.
// =============================================================================

export const TRADE_EVENT_CATEGORIES = [
  "approval",
  "risk",
  "intervention",
  "escalation",
  "exit",
  "reflection",
  "position_management",
  "rule_violation",
] as const;
export type TradeEventCategory = (typeof TRADE_EVENT_CATEGORIES)[number];

const CATEGORY_LABEL: Record<TradeEventCategory, string> = {
  approval: "Approval",
  risk: "Risk",
  intervention: "Intervention",
  escalation: "Escalation",
  exit: "Exit",
  reflection: "Reflection",
  position_management: "Position",
  rule_violation: "Rule Violation",
};

// Tonal palette per category. Tones are not redundant with severity —
// they signal CATEGORY identity. Severity is rendered separately via
// dot + ring + label. Tuned to keep the dark behavioral aesthetic; no
// loud colors.
const CATEGORY_TONE: Record<TradeEventCategory, string> = {
  approval: "text-brand bg-brand/10 ring-brand/30",
  risk: "text-amber-300/95 bg-amber-500/10 ring-amber-500/30",
  intervention: "text-sky-300/95 bg-sky-500/10 ring-sky-500/30",
  escalation: "text-rose-300/95 bg-rose-500/10 ring-rose-500/30",
  exit: "text-foreground/85 bg-foreground/[0.07] ring-white/15",
  reflection: "text-emerald-300/95 bg-emerald-500/10 ring-emerald-500/25",
  position_management: "text-violet-300/95 bg-violet-500/10 ring-violet-500/25",
  rule_violation: "text-rose-200/95 bg-rose-500/15 ring-rose-500/40",
};

export function categoryLabel(c: TradeEventCategory): string {
  return CATEGORY_LABEL[c];
}

export function categoryTone(c: TradeEventCategory): string {
  return CATEGORY_TONE[c];
}

// -----------------------------------------------------------------------------
// Behavior event → category
// -----------------------------------------------------------------------------
const BEHAVIOR_EVENT_CATEGORY: Partial<
  Record<BehaviorEventType, TradeEventCategory>
> = {
  [BEHAVIOR_EVENT_TYPES.TRADE_APPROVED]: "approval",
  [BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE]: "approval",
  [BEHAVIOR_EVENT_TYPES.TRADE_CLOSED]: "exit",
  [BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED]: "risk",
  [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED]: "rule_violation",
  [BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED]: "intervention",
  [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER]: "risk",
  [BEHAVIOR_EVENT_TYPES.STOP_TIGHTENED]: "risk",
  [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED]: "position_management",
  [BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED]: "risk",
  [BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED]: "escalation",
  [BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED]: "escalation",
  [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION]: "escalation",
  [BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED]: "reflection",
  [BEHAVIOR_EVENT_TYPES.MISTAKE_MARKED]: "reflection",
  [BEHAVIOR_EVENT_TYPES.TRADE_EXIT_REFLECTION_ADDED]: "reflection",
  [BEHAVIOR_EVENT_TYPES.TRADE_AVOIDED]: "intervention",
  [BEHAVIOR_EVENT_TYPES.TRADE_REVISED]: "intervention",
  [BEHAVIOR_EVENT_TYPES.REWARD_RISK_DEGRADED]: "risk",
};

export function categoryForBehaviorEvent(
  e: BehaviorEvent,
): TradeEventCategory {
  return BEHAVIOR_EVENT_CATEGORY[e.eventType] ?? "risk";
}

// -----------------------------------------------------------------------------
// Monitoring deviation → category
// -----------------------------------------------------------------------------
const DEVIATION_CATEGORY: Record<BehavioralDeviationType, TradeEventCategory> = {
  stop_moved_further: "risk",
  stop_tightened: "risk",
  position_size_increased: "position_management",
  averaging_down: "escalation",
  reward_risk_degraded: "risk",
  excessive_adds: "escalation",
  risk_exposure_increased: "risk",
  behavioral_mistake_logged: "reflection",
  rapid_post_loss_reactivation: "escalation",
  oversized_exposure_increase: "escalation",
};

export function categoryForMonitoringEvent(
  m: MonitoringEvent,
): TradeEventCategory {
  // Choose the dominant deviation's category — the deviation list is
  // already sorted by severity in the engine, so the first entry is
  // the right one to surface.
  const top = m.deviations[0];
  if (!top) return "risk";
  return DEVIATION_CATEGORY[top.type] ?? "risk";
}

// -----------------------------------------------------------------------------
// Intervention decision → category
// -----------------------------------------------------------------------------
// All three intervention decisions (continue_anyway / revise_trade /
// cancel_trade) read as "intervention" — the trader chose at the rule
// check. Severity disambiguates: continue_anyway is warning+, the
// others are info. Kept as a function (not a constant) so the call
// site reads consistently with the other category resolvers and future
// per-decision divergence stays cheap.
export function categoryForIntervention(): TradeEventCategory {
  return "intervention";
}
