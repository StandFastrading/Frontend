import { z } from "zod";

// Behavioral Deviation Engine schemas. Active Trade Monitoring is the first
// place these are produced; Journal, Reports, and Behavior Analytics consume
// them. None of these types are renamed once shipped — strings persist.

export const DEVIATION_SEVERITIES = [
  "info",
  "caution",
  "elevated",
  "critical",
] as const;
export type DeviationSeverity = (typeof DEVIATION_SEVERITIES)[number];

// Stable wire identifiers for every kind of deviation the engine can detect.
// Add new IDs, never rename existing ones.
export const BEHAVIORAL_DEVIATION_TYPES = [
  "stop_moved_further",
  "stop_tightened",
  "position_size_increased",
  "averaging_down",
  "reward_risk_degraded",
  "excessive_adds",
  "risk_exposure_increased",
  "behavioral_mistake_logged",
  "rapid_post_loss_reactivation",
  "oversized_exposure_increase",
] as const;
export type BehavioralDeviationType =
  (typeof BEHAVIORAL_DEVIATION_TYPES)[number];

export const behavioralDeviationSchema = z.object({
  id: z.string(),
  type: z.enum(BEHAVIORAL_DEVIATION_TYPES),
  severity: z.enum(DEVIATION_SEVERITIES),
  // Human-readable description rendered in the deviation list. Specific
  // enough that the trader can re-derive the "why" without re-running the
  // engine.
  description: z.string(),
  // Optional numeric delta — e.g. { from: 199, to: 198.5 } for a stop move.
  // Used by the UI to render a "199 → 198.5" diff chip without parsing the
  // description.
  delta: z
    .object({
      from: z.number(),
      to: z.number(),
      unit: z.enum(["price", "size", "ratio", "dollars", "percent"]),
    })
    .optional(),
});
export type BehavioralDeviation = z.infer<typeof behavioralDeviationSchema>;

// Decision-context reasons captured at Move Stop time. The point is
// behavioral data capture — not classification — so future analytics
// can mine why traders move stops (breakeven discipline, profit
// locking, structure shifts, defensive risk reduction). Wire
// identifiers persist; add new IDs, never rename.
export const STOP_MOVE_REASONS = [
  "breakeven",
  "lock_profit",
  "structure",
  "risk_reduction",
  "other",
] as const;
export type StopMoveReason = (typeof STOP_MOVE_REASONS)[number];

export const STOP_MOVE_REASON_LABEL: Record<StopMoveReason, string> = {
  breakeven: "Breakeven",
  lock_profit: "Lock Profit",
  structure: "Structure",
  risk_reduction: "Risk Reduction",
  other: "Other",
};

// Decision-context reasons captured at Move Target time. Mirrors stop
// reasons in shape; semantically distinct (target moves are usually
// about extending profit, while stop moves are about protecting risk).
export const TARGET_MOVE_REASONS = [
  "momentum_extension",
  "new_resistance_level",
  "scaling_plan",
  "risk_adjustment",
  "other",
] as const;
export type TargetMoveReason = (typeof TARGET_MOVE_REASONS)[number];

export const TARGET_MOVE_REASON_LABEL: Record<TargetMoveReason, string> = {
  momentum_extension: "Momentum Extension",
  new_resistance_level: "New Resistance Level",
  scaling_plan: "Scaling Plan",
  risk_adjustment: "Risk Adjustment",
  other: "Other",
};

// Discriminated union of every active-trade action. The Behavior Deviation
// Engine consumes one of these and returns the deviations + recommendations
// produced by applying it to the trade.
//
// Reason fields on move_stop / move_target and the optional note on
// partial_exit are V1.5 additions for behavioral-decision capture. All
// are `.optional()` so persisted records from before V1.5 still
// validate. Future analytics passes can mine these for stop-management
// quality, target-extension frequency, scaling discipline, etc.
export const activeTradeUpdateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move_stop"),
    newStopPrice: z.number(),
    reason: z.enum(STOP_MOVE_REASONS).optional(),
  }),
  z.object({
    type: z.literal("move_target"),
    newTargetPrice: z.number(),
    reason: z.enum(TARGET_MOVE_REASONS).optional(),
  }),
  z.object({
    type: z.literal("add_position"),
    additionalSize: z.number(),
    addedAtPrice: z.number(),
  }),
  z.object({
    type: z.literal("partial_exit"),
    sizeReduced: z.number(),
    exitPrice: z.number(),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal("mark_mistake"),
    note: z.string(),
  }),
  z.object({
    type: z.literal("log_exit"),
    exitPrice: z.number(),
    outcome: z.enum(["win", "loss", "breakeven"]),
  }),
]);
export type ActiveTradeUpdate = z.infer<typeof activeTradeUpdateSchema>;
export type ActiveTradeUpdateType = ActiveTradeUpdate["type"];

// Advisory next-step surfaced in the Active Trade Monitoring panel banner.
// Wording is engineered to never imply broker enforcement — only review.
export const interventionRecommendationSchema = z.object({
  id: z.string(),
  severity: z.enum(DEVIATION_SEVERITIES),
  title: z.string(),
  body: z.string(),
});
export type InterventionRecommendation = z.infer<
  typeof interventionRecommendationSchema
>;

// Persisted record of one update + everything the engine detected. Each
// MonitoringEvent links back to its `tradeId` so the panel can scope events
// to the currently-displayed trade.
export const monitoringEventSchema = z.object({
  id: z.string(),
  tradeId: z.string(),
  timestamp: z.string(),
  update: activeTradeUpdateSchema,
  deviations: z.array(behavioralDeviationSchema),
  severity: z.enum(DEVIATION_SEVERITIES),
  recommendations: z.array(interventionRecommendationSchema),
  // Session scope (optional for legacy records).
  sessionId: z.string().optional(),
  tradingDate: z.string().optional(),
});
export type MonitoringEvent = z.infer<typeof monitoringEventSchema>;
