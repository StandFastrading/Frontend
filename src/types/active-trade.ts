import { z } from "zod";

import { triggeredRuleSchema } from "@/types/behavior-event";
import { MARKET_TYPES, TRADE_DIRECTIONS } from "@/types/risk";

// `ActiveTrade` is what we know about a position the trader has confirmed
// they entered. StandFast does not have broker visibility yet — the trader
// must manually confirm via "Mark Trade as Active", which produces this
// record from an `ApprovedTradeSnapshot`. `source: "manual_confirmation"`
// makes that explicit; broker-integrated activations will use a different
// source value once that pipe exists.

export const ACTIVE_TRADE_STATUSES = ["active", "closed"] as const;
export type ActiveTradeStatus = (typeof ACTIVE_TRADE_STATUSES)[number];

export const ACTIVE_TRADE_SOURCES = ["manual_confirmation"] as const;
export type ActiveTradeSource = (typeof ACTIVE_TRADE_SOURCES)[number];

// How the trade reached "marked active". `approved` = clean rule check;
// `approved_with_warnings` = trader chose Continue Anyway on a warning-only
// check (no hard fails). Fail-violations never reach activation. Behavior
// Analytics treats `approved_with_warnings` as the high-value signal.
export const ACTIVE_TRADE_APPROVAL_STATUSES = [
  "approved",
  "approved_with_warnings",
] as const;
export type ActiveTradeApprovalStatus =
  (typeof ACTIVE_TRADE_APPROVAL_STATUSES)[number];

export const ACTIVE_TRADE_EXIT_OUTCOMES = [
  "win",
  "loss",
  "breakeven",
] as const;
export type ActiveTradeExitOutcome =
  (typeof ACTIVE_TRADE_EXIT_OUTCOMES)[number];

export const activeTradeSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  marketType: z.enum(MARKET_TYPES),
  direction: z.enum(TRADE_DIRECTIONS),
  // Baseline fields — frozen at approval, never mutated. Behavioral Deviation
  // Engine compares everything to these. `stopPrice` is nullable because the
  // Continue Anyway override path admits trades without a defined stop —
  // when missing, risk math falls back to null and the missing-stop warning
  // is preserved on `approvalWarnings`.
  entryPrice: z.number(),
  stopPrice: z.number().nullable(),
  targetPrice: z.number().nullable(),
  positionSize: z.number(),
  setupType: z.string(),
  tradePlan: z.string(),
  approvedAt: z.string(),
  activatedAt: z.string(),
  // All risk-derived fields are nullable — when stop is missing, none of
  // these can be computed honestly. UI formatters render "—" in that case.
  originalRisk: z.number().nullable(),
  accountRiskPercent: z.number().nullable(),
  rewardRiskRatio: z.number().nullable(),
  // Current (mutable) state — moves with Move Stop / Move Target / Add
  // Position / Partial Exit. Initialized to match the baseline at
  // activation; updates from the monitoring engine flow through here.
  // `currentTargetPrice` is V1.5 — older records backfill from baseline
  // `targetPrice` via the migration below.
  currentStopPrice: z.number().nullable(),
  currentTargetPrice: z.number().nullable(),
  currentPositionSize: z.number(),
  currentAvgEntry: z.number(),
  currentRisk: z.number().nullable(),
  currentAccountRiskPercent: z.number().nullable(),
  currentRewardRiskRatio: z.number().nullable(),
  // Mistakes are surfaced separately from deviations so the panel can show a
  // dedicated flag without scanning monitoringEvents.
  mistakeFlagged: z.boolean(),
  mistakeNote: z.string().nullable(),
  // Exit fields — populated only after Log Exit.
  closedAt: z.string().nullable(),
  exitPrice: z.number().nullable(),
  exitOutcome: z.enum(ACTIVE_TRADE_EXIT_OUTCOMES).nullable(),
  // Realized math, frozen at the moment of exit. `realizedR` is the
  // multiple of `originalRisk` (e.g. +1.5R, -1R). `exitReflection` is the
  // optional free-text note the trader can write when logging the exit.
  realizedPnL: z.number().nullable(),
  realizedR: z.number().nullable(),
  exitReflection: z.string().nullable(),
  // Approval-pathway metadata — preserved on the live trade so the panel
  // can render "Activated with acknowledged warnings" + the warnings the
  // trader chose to override.
  approvalStatus: z.enum(ACTIVE_TRADE_APPROVAL_STATUSES),
  approvalWarnings: z.array(triggeredRuleSchema),
  // `overrideAccepted: true` when the trader reached activation via the
  // Continue Anyway path on a warning/violation modal. Redundant with
  // `approvalStatus === "approved_with_warnings"` but stored explicitly per
  // spec — analytics keys off it directly.
  overrideAccepted: z.boolean(),
  status: z.enum(ACTIVE_TRADE_STATUSES),
  source: z.enum(ACTIVE_TRADE_SOURCES),
  // Session scope (optional for legacy records).
  sessionId: z.string().optional(),
  tradingDate: z.string().optional(),
});
export type ActiveTrade = z.infer<typeof activeTradeSchema>;

// Best-effort migration for persisted ActiveTrade records written under an
// older schema. New `current*` / mistake / exit fields are backfilled from
// the baseline so older records don't crash UI code that reads them.
// Called from the store's `merge` callback on hydration.
//
// Defensive guarantee: any record with `status: "closed"` is dropped here
// (returns null). The active-trades collection is exclusively for OPEN
// positions; a closed record sneaking back into it (e.g. from an older
// bug where `logExit` flipped status before removing) is filtered out so
// it never resurrects in the Active Trade Monitoring panel.
export function migrateActiveTrade(raw: unknown): ActiveTrade | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // Closed records never belong in activeTrades. The archive lives in
  // closedTrades; the active collection is OPEN-only.
  if (r.status === "closed") return null;

  // Baseline fields must exist; without them we can't reconstruct anything.
  // `stopPrice` is no longer a hard requirement — override activations may
  // legitimately have a null stop. Symbol + direction + entry + size are
  // the four essentials.
  const requiredString = (v: unknown): v is string =>
    typeof v === "string" && v.length > 0;
  const requiredNumber = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v);
  if (
    !requiredString(r.id) ||
    !requiredNumber(r.entryPrice) ||
    !requiredNumber(r.positionSize)
  ) {
    return null;
  }

  const baseEntry = r.entryPrice;
  const baseStop: number | null = requiredNumber(r.stopPrice)
    ? r.stopPrice
    : null;
  const baseSize = r.positionSize;
  const baseRisk: number | null =
    typeof r.originalRisk === "number" && Number.isFinite(r.originalRisk)
      ? r.originalRisk
      : baseStop != null
        ? Math.abs(baseEntry - baseStop) * baseSize
        : null;
  const baseAccountRiskPercent: number | null =
    typeof r.accountRiskPercent === "number" &&
    Number.isFinite(r.accountRiskPercent)
      ? r.accountRiskPercent
      : null;
  const baseRewardRiskRatio =
    typeof r.rewardRiskRatio === "number" && Number.isFinite(r.rewardRiskRatio)
      ? r.rewardRiskRatio
      : null;

  const migrated = {
    ...r,
    // Pre-flight baseline (kept as-is when present).
    stopPrice: baseStop,
    originalRisk: baseRisk,
    accountRiskPercent: baseAccountRiskPercent,
    targetPrice:
      typeof r.targetPrice === "number" && Number.isFinite(r.targetPrice)
        ? r.targetPrice
        : null,
    rewardRiskRatio: baseRewardRiskRatio,
    // Backfill the live-state fields from the baseline so an older record
    // renders without crashing. Once the trader interacts (Move Stop, Add,
    // etc.) the action thunks overwrite these with real values.
    currentStopPrice:
      typeof r.currentStopPrice === "number"
        ? r.currentStopPrice
        : baseStop,
    currentTargetPrice:
      typeof r.currentTargetPrice === "number" &&
      Number.isFinite(r.currentTargetPrice)
        ? r.currentTargetPrice
        : typeof r.targetPrice === "number" && Number.isFinite(r.targetPrice)
          ? r.targetPrice
          : null,
    currentPositionSize:
      typeof r.currentPositionSize === "number"
        ? r.currentPositionSize
        : baseSize,
    currentAvgEntry:
      typeof r.currentAvgEntry === "number" ? r.currentAvgEntry : baseEntry,
    currentRisk:
      typeof r.currentRisk === "number" ? r.currentRisk : baseRisk,
    currentAccountRiskPercent:
      typeof r.currentAccountRiskPercent === "number"
        ? r.currentAccountRiskPercent
        : baseAccountRiskPercent,
    currentRewardRiskRatio:
      typeof r.currentRewardRiskRatio === "number"
        ? r.currentRewardRiskRatio
        : baseRewardRiskRatio,
    mistakeFlagged:
      typeof r.mistakeFlagged === "boolean" ? r.mistakeFlagged : false,
    mistakeNote: typeof r.mistakeNote === "string" ? r.mistakeNote : null,
    closedAt: typeof r.closedAt === "string" ? r.closedAt : null,
    exitPrice:
      typeof r.exitPrice === "number" && Number.isFinite(r.exitPrice)
        ? r.exitPrice
        : null,
    exitOutcome:
      r.exitOutcome === "win" ||
      r.exitOutcome === "loss" ||
      r.exitOutcome === "breakeven"
        ? r.exitOutcome
        : null,
    realizedPnL:
      typeof r.realizedPnL === "number" && Number.isFinite(r.realizedPnL)
        ? r.realizedPnL
        : null,
    realizedR:
      typeof r.realizedR === "number" && Number.isFinite(r.realizedR)
        ? r.realizedR
        : null,
    exitReflection:
      typeof r.exitReflection === "string" ? r.exitReflection : null,
    // Pre-dates the approval-status split — assume legacy records came from
    // clean approvals (the only path that previously produced an active
    // trade). Warning-overrides are tagged explicitly going forward.
    approvalStatus:
      r.approvalStatus === "approved_with_warnings"
        ? "approved_with_warnings"
        : "approved",
    approvalWarnings: Array.isArray(r.approvalWarnings)
      ? r.approvalWarnings
      : [],
    overrideAccepted:
      typeof r.overrideAccepted === "boolean"
        ? r.overrideAccepted
        : r.approvalStatus === "approved_with_warnings",
    // Guaranteed "active" by the early-return above; codified here so the
    // Zod parse below doesn't infer a wider union.
    status: "active" as const,
  };

  const parsed = activeTradeSchema.safeParse(migrated);
  return parsed.success ? parsed.data : null;
}

// Transient state held between approval and the trader clicking "Mark Trade
// as Active". Not persisted — a reload resets the approval state since the
// user might want to start fresh. Excludes every mutable field on
// ActiveTrade because the snapshot is, by definition, pre-activation.
export type ApprovedTradeSnapshot = Omit<
  ActiveTrade,
  | "id"
  | "activatedAt"
  | "status"
  | "source"
  | "currentStopPrice"
  | "currentTargetPrice"
  | "currentPositionSize"
  | "currentAvgEntry"
  | "currentRisk"
  | "currentAccountRiskPercent"
  | "currentRewardRiskRatio"
  | "mistakeFlagged"
  | "mistakeNote"
  | "closedAt"
  | "exitPrice"
  | "exitOutcome"
  | "realizedPnL"
  | "realizedR"
  | "exitReflection"
>;
