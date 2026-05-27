import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  ClosedTrade,
  InterventionEvent,
  TriggeredRule,
} from "@/types";

// SECTION — Pre-trade Context
//
// "What did this trade look like when the trader took it?" Surfaces
// the snapshot data captured on the intervention record (validation
// status, warnings/violations on the rule check, account risk %, R:R)
// PLUS recent-streak context derived from prior closed trades. Answers
// "why did I take this trade?" without requiring a heuristic
// reconstruction of behavioral state.

type ValidationTone = "clear" | "warning" | "violation";

const VALIDATION_FRAME: Record<ValidationTone, string> = {
  clear: "border-emerald-500/25 bg-emerald-500/[0.05]",
  warning: "border-amber-500/25 bg-amber-500/[0.05]",
  violation: "border-rose-500/30 bg-rose-500/[0.06]",
};

const VALIDATION_PILL: Record<ValidationTone, string> = {
  clear: "text-emerald-300 bg-emerald-500/15 ring-emerald-500/30",
  warning: "text-amber-300 bg-amber-500/15 ring-amber-500/30",
  violation: "text-rose-300 bg-rose-500/15 ring-rose-500/30",
};

const VALIDATION_LABEL: Record<ValidationTone, string> = {
  clear: "Cleared",
  warning: "Warnings present",
  violation: "Rule violations",
};

const DECISION_LABEL: Record<string, string> = {
  continue_anyway: "Continue Anyway accepted",
  revise_trade: "Revised before entry",
  cancel_trade: "Canceled (no entry)",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStreakDuration(deltaMs: number): string {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return "—";
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24)
    return rem === 0 ? `${hours}h ago` : `${hours}h ${rem}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Pick the approval intervention for this trade — the one closest BEFORE
// `approvedAt` (typically a continue_anyway when warnings were present).
// `interventions` is already pre-filtered by the caller to this trade's
// symbol + timing window, so we just take the latest one not after approval.
function findApprovalIntervention(
  trade: ClosedTrade,
  interventions: InterventionEvent[],
): InterventionEvent | null {
  const approvedMs = new Date(trade.approvedAt).getTime();
  if (!Number.isFinite(approvedMs)) return null;
  let best: InterventionEvent | null = null;
  let bestT = -Infinity;
  for (const i of interventions) {
    const t = new Date(i.timestamp).getTime();
    if (!Number.isFinite(t)) continue;
    if (t > approvedMs + 60_000) continue;
    if (t > bestT) {
      best = i;
      bestT = t;
    }
  }
  return best;
}

type StreakEntry = {
  id: string;
  outcome: ClosedTrade["outcome"];
  closedAt: string;
  symbol: string;
};

function buildRecentStreak(
  trade: ClosedTrade,
  allClosed: ClosedTrade[],
  limit = 5,
): StreakEntry[] {
  const approvedMs = new Date(trade.approvedAt).getTime();
  if (!Number.isFinite(approvedMs)) return [];
  const prior = allClosed
    .filter((t) => t.id !== trade.id)
    .filter((t) => {
      const c = new Date(t.closedAt).getTime();
      return Number.isFinite(c) && c < approvedMs;
    })
    .sort(
      (a, b) =>
        new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
    )
    .slice(0, limit);
  return prior.map((t) => ({
    id: t.id,
    outcome: t.outcome,
    closedAt: t.closedAt,
    symbol: t.symbol,
  }));
}

function findTimeSinceLastLoss(
  trade: ClosedTrade,
  allClosed: ClosedTrade[],
): { ms: number; closedAt: string } | null {
  const approvedMs = new Date(trade.approvedAt).getTime();
  if (!Number.isFinite(approvedMs)) return null;
  let nearest: ClosedTrade | null = null;
  let nearestT = -Infinity;
  for (const t of allClosed) {
    if (t.id === trade.id) continue;
    if (t.outcome !== "loss") continue;
    const c = new Date(t.closedAt).getTime();
    if (!Number.isFinite(c)) continue;
    if (c >= approvedMs) continue;
    if (c > nearestT) {
      nearest = t;
      nearestT = c;
    }
  }
  if (!nearest) return null;
  return { ms: approvedMs - nearestT, closedAt: nearest.closedAt };
}

const OUTCOME_DOT: Record<ClosedTrade["outcome"], string> = {
  win: "bg-emerald-400/90 ring-emerald-500/30",
  loss: "bg-rose-400/90 ring-rose-500/30",
  breakeven: "bg-muted-foreground/60 ring-white/15",
};

const OUTCOME_GLYPH: Record<ClosedTrade["outcome"], string> = {
  win: "W",
  loss: "L",
  breakeven: "B",
};

export function TradePretradeContext({
  trade,
  interventions,
  allClosedTrades,
}: {
  trade: ClosedTrade;
  interventions: InterventionEvent[];
  allClosedTrades: ClosedTrade[];
}) {
  const intervention = findApprovalIntervention(trade, interventions);
  const streak = buildRecentStreak(trade, allClosedTrades);
  const lastLoss = findTimeSinceLastLoss(trade, allClosedTrades);

  // Validation tone — derived from intervention if present, else "clear"
  // (no rule-check warning surfaced ⇒ approval was clean).
  const validation: ValidationTone =
    intervention?.validationStatus === "violation"
      ? "violation"
      : intervention?.validationStatus === "warning"
        ? "warning"
        : "clear";

  const triggeredRules: TriggeredRule[] = intervention?.triggeredRules ?? [];
  const warningCount = intervention?.warningCount ?? 0;
  const violationCount = intervention?.violationCount ?? 0;
  const decisionLabel = intervention
    ? (DECISION_LABEL[intervention.decision] ?? intervention.decision)
    : "Cleared with no warnings";

  const accountRiskPct = intervention?.accountRiskPercent ?? null;
  const rewardRiskRatio = intervention?.rewardRiskRatio ?? null;

  const ValidationIcon =
    validation === "clear"
      ? ShieldCheck
      : validation === "warning"
        ? ShieldAlert
        : XCircle;

  return (
    <section
      aria-label="Pre-trade context"
      className={cn(
        "flex flex-col gap-4 rounded-2xl border p-5 backdrop-blur",
        VALIDATION_FRAME[validation],
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ValidationIcon
          className={cn(
            "size-4",
            validation === "clear"
              ? "text-emerald-300"
              : validation === "warning"
                ? "text-amber-300"
                : "text-rose-300",
          )}
        />
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Context at Approval
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] ring-1",
            VALIDATION_PILL[validation],
          )}
        >
          {VALIDATION_LABEL[validation]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Left: rule-check snapshot */}
        <div className="flex flex-col gap-2.5 leading-tight">
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Rule check
          </span>
          <span className="text-sm font-medium text-foreground">
            {decisionLabel}
          </span>
          {intervention ? (
            <div className="flex flex-wrap gap-1.5">
              {violationCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-rose-300 ring-1 ring-rose-500/30">
                  <XCircle className="size-3" />
                  {violationCount} violation{violationCount === 1 ? "" : "s"}
                </span>
              ) : null}
              {warningCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-amber-300 ring-1 ring-amber-500/30">
                  <AlertTriangle className="size-3" />
                  {warningCount} warning{warningCount === 1 ? "" : "s"}
                </span>
              ) : null}
              {warningCount === 0 && violationCount === 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-emerald-300 ring-1 ring-emerald-500/30">
                  <CheckCircle2 className="size-3" />
                  No warnings
                </span>
              ) : null}
            </div>
          ) : (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-emerald-300 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="size-3" />
              No intervention record
            </span>
          )}
          {triggeredRules.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-1 border-t border-white/5 pt-2">
              {triggeredRules.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start gap-2 text-[0.7rem] leading-snug"
                >
                  <span
                    className={cn(
                      "mt-1 size-1.5 shrink-0 rounded-full",
                      r.status === "fail" ? "bg-rose-400" : "bg-amber-400",
                    )}
                  />
                  <span className="text-foreground/85">
                    <span className="font-medium">{r.label}</span>
                    {r.message ? (
                      <span className="text-muted-foreground"> — {r.message}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Right: risk + R:R snapshot at approval */}
        <div className="flex flex-col gap-2.5 leading-tight">
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Risk snapshot
          </span>
          <div className="grid grid-cols-2 gap-3">
            <SnapshotField
              label="Account risk"
              value={
                accountRiskPct != null && Number.isFinite(accountRiskPct)
                  ? `${accountRiskPct.toFixed(2)}%`
                  : "—"
              }
            />
            <SnapshotField
              label="Reward : Risk"
              value={
                rewardRiskRatio != null && Number.isFinite(rewardRiskRatio)
                  ? `${rewardRiskRatio.toFixed(2)}R`
                  : "—"
              }
            />
            <SnapshotField
              label="Approved"
              value={formatTime(trade.approvedAt)}
            />
            <SnapshotField
              label="Activated"
              value={formatTime(trade.activatedAt)}
            />
          </div>
        </div>
      </div>

      {/* Recent streak strip + time-since-last-loss */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-white/5 pt-3">
        <div className="flex flex-col gap-1.5 leading-tight">
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Last {streak.length || 0} closes before this trade
          </span>
          {streak.length === 0 ? (
            <span className="text-[0.7rem] text-muted-foreground">
              First closed trade in scope.
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Render oldest → newest left-to-right so the streak reads
                  forward in time. */}
              {[...streak].reverse().map((s) => (
                <span
                  key={s.id}
                  title={`${s.symbol} · ${s.outcome} · ${new Date(s.closedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}`}
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[0.55rem] font-semibold uppercase tracking-tight text-background ring-1",
                    OUTCOME_DOT[s.outcome],
                  )}
                >
                  {OUTCOME_GLYPH[s.outcome]}
                </span>
              ))}
              <Circle className="size-2 fill-foreground/40 stroke-none" />
              <span className="text-[0.6rem] uppercase tracking-[0.16em] text-foreground/70">
                this trade
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 leading-tight text-muted-foreground">
          <Clock className="size-3.5" />
          <span className="text-[0.7rem]">
            {lastLoss
              ? `Last loss ${formatStreakDuration(lastLoss.ms)}`
              : "No prior loss in scope"}
          </span>
        </div>
      </div>
    </section>
  );
}

function SnapshotField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}
