import { z } from "zod";

import { triggeredRuleSchema, type TriggeredRule } from "@/types/behavior-event";
import {
  riskCalculationResultSchema,
  type RiskCalculationResult,
} from "@/types/risk";

// Centralized types produced by the trade validation engine. Shared with the
// Trade Desk UI, behavior event log, and validation history persistence.

export const RULE_STATUSES = ["pass", "warning", "fail", "not-checked"] as const;
export type RuleStatus = (typeof RULE_STATUSES)[number];

export const VALIDATION_SEVERITIES = [
  "approved",
  "warning",
  "violation",
] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

export const ruleResultSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(RULE_STATUSES),
  message: z.string().optional(),
  recommendedAction: z.string().optional(),
});
export type RuleResult = z.infer<typeof ruleResultSchema>;

export const validationResultSchema = z.object({
  validationStatus: z.enum(VALIDATION_SEVERITIES),
  canReceiveStandFastApproval: z.boolean(),
  ruleResults: z.array(ruleResultSchema),
  triggeredRules: z.array(triggeredRuleSchema),
  recommendation: z.string().nullable(),
  riskCalculation: riskCalculationResultSchema,
  timestamp: z.string(),
});
export type ValidationResult = z.infer<typeof validationResultSchema>;

// Re-export commonly co-imported types so callers can grab everything from
// @/types/validation in one place.
export type { RiskCalculationResult, TriggeredRule };
