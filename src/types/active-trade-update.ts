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

// Discriminated union of every active-trade action. The Behavior Deviation
// Engine consumes one of these and returns the deviations + recommendations
// produced by applying it to the trade.
export const activeTradeUpdateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("move_stop"),
    newStopPrice: z.number(),
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
