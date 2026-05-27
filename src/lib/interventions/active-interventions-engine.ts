"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, ShieldAlert, Timer, type LucideIcon } from "lucide-react";

import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  useCurrentSessionEvents,
  useCurrentSessionTrades,
} from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";
import type {
  BehaviorEvent,
  ClosedTrade,
  RiskRules,
  SessionMetrics,
} from "@/types";

// =============================================================================
// Active Interventions Engine
// =============================================================================
//
// PURPOSE
//   Derives the live list of intervention LOCKS currently active on the
//   session — re-entry cooldowns, consecutive-loss pauses, daily-loss
//   lockouts. These are distinct from `InterventionEvent` records, which
//   are decision-log entries (Cancel / Revise / Continue Anyway). The
//   locks here are the rate-limiters those decisions are reacting to.
//
// DESIGN
//   * Pure derivation over session metrics + closed trades + risk rules.
//     No persistent state of its own; everything is computed from inputs.
//   * Pure function takes `nowMs` for testability.
//   * React hook ticks every 15 seconds so the "ends in X min" labels and
//     `remainingMs` countdowns advance live without requiring a new event
//     to land.
//   * Each lock surfaces a `violationCount` — the number of new trade
//     activations that occurred during this lock's active window. Lets
//     the UI render "this cooldown has been violated 2× already" so the
//     escalation reads as believable.
//
// LIFECYCLE
//   loss_cooldown          triggered by last losing closedTrade.closedAt;
//                          expires at closedAt + cooldownAfterLossMinutes.
//   consecutive_loss_pause triggered when consecutiveLosses ≥ cap;
//                          expires only on next win OR session-end.
//   daily_loss_lockout     triggered by dailyLossLimitBreached;
//                          expires at session-end only.
//
//   Each lock auto-removes from the returned list once expired.
// =============================================================================

export const ACTIVE_INTERVENTION_IDS = [
  "loss_cooldown",
  "consecutive_loss_pause",
  "daily_loss_lockout",
] as const;
export type ActiveInterventionId = (typeof ACTIVE_INTERVENTION_IDS)[number];

export type ActiveInterventionSeverity = "caution" | "warning" | "critical";

export type ActiveInterventionRecord = {
  id: ActiveInterventionId;
  title: string;
  description: string;
  severity: ActiveInterventionSeverity;
  icon: LucideIcon;
  // Trigger timestamp — ISO. Surfaces as "Triggered: 10:42 AM" in the UI.
  triggeredAt: string;
  // Expiry — ISO when the lock auto-clears, null when expiry is session-end
  // only (consecutive-loss pause + daily-loss lockout).
  expiresAt: string | null;
  // Remaining milliseconds — null for session-end locks.
  remainingMs: number | null;
  // Human-readable remaining label. "18 min" / "<1 min" / "Ends for today".
  remainingLabel: string;
  // Number of new TRADE_MARKED_ACTIVE events that occurred during this
  // lock's active window. > 0 means the trader has already violated.
  violationCount: number;
};

export type ActiveInterventionsInputs = {
  closedTrades: ClosedTrade[];
  behaviorEvents: BehaviorEvent[];
  sessionMetrics: SessionMetrics;
  riskRules: RiskRules;
  nowMs: number;
};

// -----------------------------------------------------------------------------
// Display helpers
// -----------------------------------------------------------------------------

function formatRemaining(remainingMs: number | null): string {
  if (remainingMs == null) return "Ends for today";
  const minutes = Math.ceil(remainingMs / 60_000);
  if (minutes <= 0) return "Expiring";
  if (minutes === 1) return "<1 min";
  return `${minutes} min`;
}

function countViolations(
  windowStartMs: number,
  windowEndMs: number,
  behaviorEvents: BehaviorEvent[],
): number {
  return behaviorEvents.filter((e) => {
    if (e.eventType !== BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE) return false;
    const t = new Date(e.timestamp).getTime();
    if (!Number.isFinite(t)) return false;
    return t >= windowStartMs && t <= windowEndMs;
  }).length;
}

// -----------------------------------------------------------------------------
// Per-intervention detectors
// -----------------------------------------------------------------------------

function detectLossCooldown(
  inputs: ActiveInterventionsInputs,
): ActiveInterventionRecord | null {
  const { closedTrades, behaviorEvents, riskRules, nowMs } = inputs;
  // Most recent loss (any session-scoped closed trade with outcome = loss).
  const lastLoss = [...closedTrades]
    .filter((t) => t.outcome === "loss")
    .sort(
      (a, b) =>
        new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
    )[0];
  if (!lastLoss) return null;

  const triggeredAtMs = new Date(lastLoss.closedAt).getTime();
  if (!Number.isFinite(triggeredAtMs)) return null;

  // Cooldown duration ESCALATES with violation history. Each prior
  // violation extends the window by 50%, up to 3× the base. The trader
  // who re-enters during the cool-off doesn't just trip the warning —
  // the cool-off itself gets longer.
  const baseMinutes = Math.max(1, riskRules.cooldownAfterLossMinutes);
  const interimViolations = countViolations(
    triggeredAtMs,
    nowMs,
    behaviorEvents,
  );
  const scaleFactor = 1 + Math.min(interimViolations, 4) * 0.5;
  const scaledMinutes = baseMinutes * scaleFactor;
  const expiresAtMs = triggeredAtMs + scaledMinutes * 60_000;
  if (expiresAtMs <= nowMs) return null;

  const remainingMs = expiresAtMs - nowMs;
  const violationCount = interimViolations;

  // Clinical, escalating language. Tone gets firmer with each violation
  // but stays disciplined — no drama, no emotional vocabulary.
  let description: string;
  let severity: ActiveInterventionSeverity;
  if (violationCount === 0) {
    description = `${baseMinutes}-min cool-off after losing trade on ${lastLoss.symbol}. Review recommended before the next entry.`;
    severity = "caution";
  } else if (violationCount === 1) {
    description = `Re-entry attempted during active cool-off on ${lastLoss.symbol}. Cool-off window extended.`;
    severity = "warning";
  } else {
    description = `${violationCount} re-entry attempts during active cool-off. Behavior deterioration detected — cool-off extended ${Math.round((scaleFactor - 1) * 100)}%.`;
    severity = "critical";
  }

  return {
    id: "loss_cooldown",
    title: "Re-entry cooldown",
    description,
    severity,
    icon: Timer,
    triggeredAt: lastLoss.closedAt,
    expiresAt: new Date(expiresAtMs).toISOString(),
    remainingMs,
    remainingLabel: formatRemaining(remainingMs),
    violationCount,
  };
}

function detectConsecutiveLossPause(
  inputs: ActiveInterventionsInputs,
): ActiveInterventionRecord | null {
  const { closedTrades, behaviorEvents, sessionMetrics, riskRules } = inputs;
  if (sessionMetrics.consecutiveLosses < riskRules.maxConsecutiveLosses)
    return null;

  // Trigger time = the closeAt of the loss that completed the streak. We
  // count back consecutiveLosses entries from the most recent close.
  const closesNewestFirst = [...closedTrades].sort(
    (a, b) =>
      new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
  );
  const triggerTrade = closesNewestFirst[0] ?? null;
  if (!triggerTrade) return null;
  const triggeredAtMs = new Date(triggerTrade.closedAt).getTime();
  if (!Number.isFinite(triggeredAtMs)) return null;

  const violationCount = countViolations(
    triggeredAtMs,
    inputs.nowMs,
    behaviorEvents,
  );

  // Clinical escalating language. Three stages: review-recommended,
  // deterioration-detected, stability-compromised.
  let description: string;
  let severity: ActiveInterventionSeverity;
  if (violationCount === 0) {
    description = `${sessionMetrics.consecutiveLosses} losses in a row. Review your plan before the next entry.`;
    severity = "warning";
  } else if (violationCount === 1) {
    description = `Re-entry attempted during consecutive-loss pause. Behavior deterioration detected.`;
    severity = "critical";
  } else {
    description = `${violationCount} re-entry attempts during consecutive-loss pause. Trading stability compromised.`;
    severity = "critical";
  }

  return {
    id: "consecutive_loss_pause",
    title: "Consecutive loss pause",
    description,
    severity,
    icon: ShieldAlert,
    triggeredAt: triggerTrade.closedAt,
    expiresAt: null,
    remainingMs: null,
    remainingLabel: "Ends on next win",
    violationCount,
  };
}

function detectDailyLossLockout(
  inputs: ActiveInterventionsInputs,
): ActiveInterventionRecord | null {
  const { closedTrades, behaviorEvents, sessionMetrics } = inputs;
  if (!sessionMetrics.dailyLossLimitBreached) return null;

  // Trigger time = the closeAt of the trade that breached the cap. Best
  // approximation: the most recent losing close before now. Falls back to
  // the most recent close of any kind if no losing close exists.
  const recentLoss = [...closedTrades]
    .filter((t) => t.outcome === "loss")
    .sort(
      (a, b) =>
        new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
    )[0];
  const recentAny = [...closedTrades].sort(
    (a, b) =>
      new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
  )[0];
  const triggerTrade = recentLoss ?? recentAny;
  if (!triggerTrade) return null;
  const triggeredAtMs = new Date(triggerTrade.closedAt).getTime();
  if (!Number.isFinite(triggeredAtMs)) return null;

  const violationCount = countViolations(
    triggeredAtMs,
    inputs.nowMs,
    behaviorEvents,
  );

  // Clinical, escalating language for a critical lock. Violations push
  // the copy from "restricted" to "behavioral instability detected".
  const description =
    violationCount === 0
      ? "Daily loss cap reached. Trading access restricted by behavioral guardrail for the rest of the session."
      : violationCount === 1
        ? "Re-entry attempted during daily lockout. Trading access restricted due to behavioral instability."
        : `${violationCount} attempts during daily lockout. Trading access restricted due to sustained behavioral instability.`;

  return {
    id: "daily_loss_lockout",
    title: "Daily loss lockout",
    description,
    severity: "critical",
    icon: Lock,
    triggeredAt: triggerTrade.closedAt,
    expiresAt: null,
    remainingMs: null,
    remainingLabel: "Ends for today",
    violationCount,
  };
}

// =============================================================================
// Public entry points
// =============================================================================

const SEVERITY_RANK: Record<ActiveInterventionSeverity, number> = {
  caution: 0,
  warning: 1,
  critical: 2,
};

export function computeActiveInterventions(
  inputs: ActiveInterventionsInputs,
): ActiveInterventionRecord[] {
  const detectors: Array<
    (i: ActiveInterventionsInputs) => ActiveInterventionRecord | null
  > = [
    detectDailyLossLockout,
    detectConsecutiveLossPause,
    detectLossCooldown,
  ];
  const records: ActiveInterventionRecord[] = [];
  for (const detect of detectors) {
    const out = detect(inputs);
    if (out) records.push(out);
  }
  records.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
  return records;
}

// 15-second tick — fast enough that "<1 min" labels move smoothly toward
// expiry without burning CPU during quiet sessions.
const TICK_MS = 15_000;

export function useActiveInterventions(): ActiveInterventionRecord[] {
  const { closedTrades } = useCurrentSessionTrades();
  const behaviorEvents = useCurrentSessionEvents();
  const sessionMetrics = useAppStore((s) => s.session);
  const riskRules = useAppStore((s) => s.riskRules);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return useMemo(
    () =>
      computeActiveInterventions({
        closedTrades,
        behaviorEvents,
        sessionMetrics,
        riskRules,
        nowMs,
      }),
    [closedTrades, behaviorEvents, sessionMetrics, riskRules, nowMs],
  );
}
