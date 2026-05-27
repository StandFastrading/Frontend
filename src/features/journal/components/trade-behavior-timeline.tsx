import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Info,
  Move,
  PlusCircle,
  ShieldOff,
  Timer,
  type LucideIcon,
} from "lucide-react";

import {
  BEHAVIOR_EVENT_DISPLAY,
  BEHAVIOR_EVENT_TYPES,
  type BehaviorEventType,
} from "@/lib/behavior-events";
import {
  categoryForBehaviorEvent,
  categoryForIntervention,
  categoryForMonitoringEvent,
  categoryLabel,
  categoryTone,
  type TradeEventCategory,
} from "@/lib/journal/trade-event-categories";
import { cn } from "@/lib/utils";
import type {
  BehavioralDeviationType,
  BehaviorEvent,
  InterventionEvent,
  MonitoringEvent,
} from "@/types";

// SECTION — Per-trade Behavioral Timeline
//
// Merges behavior events (filtered to this trade's id) + monitoring
// deviations (matched by tradeId) + interventions (matched by symbol +
// timing) into a single chronological replay.
//
// Refinement pass — what changed:
//   * Phase chip replaced with EVENT CATEGORY chip (Approval / Risk /
//     Intervention / Escalation / Exit / Reflection / Position / Rule
//     Violation). Categories are semantic, not temporal — they describe
//     what the event IS, not WHEN it happened.
//   * Severity rendered separately from category — dot color + ring tone
//     + a small severity label so the trader can scan "Risk · WARNING"
//     at a glance.
//   * Near-duplicate stop/size/risk events from the monitoring engine
//     and the behavior bus are MERGED into a single row so the replay
//     reads cleanly without losing the engine's specific detail.
//   * Running BEHAVIORAL PRESSURE level (stable → elevated → escalating
//     → unstable) carried on each row, derived from cumulative event
//     severity up to that point. Lets the timeline read as
//     "pressure-aware" not just "event-aware".

export type TradeTimelineSeverity = "info" | "caution" | "warning" | "critical";

export type TradePressureLevel =
  | "stable"
  | "elevated"
  | "escalating"
  | "unstable";

export type TradeTimelineEntry = {
  id: string;
  source: "behavior" | "monitoring" | "intervention";
  // Original wire identifier of the underlying record (behavior event
  // type, deviation type, or intervention decision) — preserved so the
  // renderer can pick the right icon without re-running categorization.
  eventType?: string;
  timestamp: string;
  title: string;
  description: string;
  severity: TradeTimelineSeverity;
  category: TradeEventCategory;
  // Running behavioral pressure AT THIS ROW (post-event). Computed
  // by walking events chronologically.
  pressure: TradePressureLevel;
};

// -----------------------------------------------------------------------------
// Severity vocabulary mapping (behavior + monitoring streams use slightly
// different severity vocabularies; both flatten to the same 4-tier scale
// used across the Trade Detail view).
// -----------------------------------------------------------------------------
const BEHAVIOR_EVENT_TO_SEVERITY: Record<string, TradeTimelineSeverity> = {
  info: "info",
  warning: "caution",
  fail: "warning",
};

const DEVIATION_TO_SEVERITY: Record<string, TradeTimelineSeverity> = {
  info: "info",
  caution: "caution",
  elevated: "warning",
  critical: "critical",
};

const SEVERITY_LABEL: Record<TradeTimelineSeverity, string> = {
  info: "Info",
  caution: "Caution",
  warning: "Warning",
  critical: "Critical",
};

const SEVERITY_DOT: Record<TradeTimelineSeverity, string> = {
  info: "bg-emerald-400",
  caution: "bg-amber-400",
  warning: "bg-rose-400",
  critical: "bg-rose-300",
};

const SEVERITY_RING: Record<TradeTimelineSeverity, string> = {
  info: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  caution: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  warning: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  critical: "bg-rose-500/20 text-rose-200 ring-rose-500/40",
};

const SEVERITY_LABEL_TONE: Record<TradeTimelineSeverity, string> = {
  info: "text-emerald-300/85",
  caution: "text-amber-300/90",
  warning: "text-rose-300/90",
  critical: "text-rose-200/95",
};

// Numeric weights drive the cumulative pressure score. Tuned so a
// single info event keeps the pressure floor low while a critical event
// alone is enough to push into "escalating".
const SEVERITY_WEIGHT: Record<TradeTimelineSeverity, number> = {
  info: 0,
  caution: 1,
  warning: 3,
  critical: 6,
};

const PRESSURE_LABEL: Record<TradePressureLevel, string> = {
  stable: "Stable",
  elevated: "Elevated",
  escalating: "Escalating",
  unstable: "Unstable",
};

const PRESSURE_TONE: Record<TradePressureLevel, string> = {
  stable: "text-emerald-300/80 bg-emerald-500/[0.06] ring-emerald-500/20",
  elevated: "text-amber-300/85 bg-amber-500/[0.07] ring-amber-500/20",
  escalating: "text-rose-300/90 bg-rose-500/[0.08] ring-rose-500/25",
  unstable: "text-rose-200/95 bg-rose-500/[0.12] ring-rose-500/35",
};

const PRESSURE_BAR_TONE: Record<TradePressureLevel, string> = {
  stable: "bg-emerald-400/60",
  elevated: "bg-amber-400/70",
  escalating: "bg-rose-400/80",
  unstable: "bg-rose-300/90",
};

// Maps pressure score → label. Thresholds tuned against the per-severity
// weights so:
//   * one warning event alone → "elevated"
//   * two warnings OR one critical → "escalating"
//   * three+ warnings OR two+ criticals → "unstable"
function pressureFromScore(score: number): TradePressureLevel {
  if (score >= 12) return "unstable";
  if (score >= 6) return "escalating";
  if (score >= 2) return "elevated";
  return "stable";
}

const EVENT_TYPE_ICON: Partial<Record<string, LucideIcon>> = {
  [BEHAVIOR_EVENT_TYPES.TRADE_APPROVED]: CheckCircle2,
  [BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE]: CheckCircle2,
  [BEHAVIOR_EVENT_TYPES.WARNING_TRIGGERED]: AlertTriangle,
  [BEHAVIOR_EVENT_TYPES.WARNING_IGNORED]: ShieldOff,
  [BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED]: ShieldOff,
  [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER]: Move,
  [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED]: PlusCircle,
  [BEHAVIOR_EVENT_TYPES.BEHAVIORAL_MISTAKE_LOGGED]: Flag,
  [BEHAVIOR_EVENT_TYPES.MISTAKE_MARKED]: Flag,
  [BEHAVIOR_EVENT_TYPES.RAPID_POST_LOSS_REACTIVATION]: Timer,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function elapsedLabel(prevIso: string, nextIso: string): string | null {
  const a = new Date(prevIso).getTime();
  const b = new Date(nextIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  const deltaMs = b - a;
  if (deltaMs < 30_000) return null;
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `+ ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `+ ${hours}h` : `+ ${hours}h ${rem}m`;
}

// -----------------------------------------------------------------------------
// Deduplication
//
// The behavior bus and the monitoring engine both emit when the trader
// widens a stop / adds size / increases risk — once from the monitoring
// engine (with the specific delta) and once from the behavior pipeline
// (with the narrative label). Both rows in the timeline reads as
// duplication.
//
// We resolve this by computing a coarse MERGE KEY for each row (e.g.
// "stop_move" for both STOP_MOVED_FURTHER and the stop_moved_further
// deviation), then walking the sorted list and folding consecutive rows
// with the same merge key + a tight time window (15s) into a single
// row. The behavior-source row wins for the headline title (cleaner
// copy); the monitoring-source row's description is lifted in as the
// detail line so the engine's specific delta is preserved.
// -----------------------------------------------------------------------------

const BEHAVIOR_MERGE_KEY: Partial<Record<BehaviorEventType, string>> = {
  [BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER]: "stop_move",
  [BEHAVIOR_EVENT_TYPES.STOP_TIGHTENED]: "stop_move",
  [BEHAVIOR_EVENT_TYPES.POSITION_SIZE_INCREASED]: "size_add",
  [BEHAVIOR_EVENT_TYPES.RISK_EXPOSURE_INCREASED]: "risk_increase",
  [BEHAVIOR_EVENT_TYPES.EXCESSIVE_ADDS_DETECTED]: "size_add",
  [BEHAVIOR_EVENT_TYPES.AVERAGING_DOWN_DETECTED]: "averaging",
};

const DEVIATION_MERGE_KEY: Partial<Record<BehavioralDeviationType, string>> = {
  stop_moved_further: "stop_move",
  stop_tightened: "stop_move",
  position_size_increased: "size_add",
  excessive_adds: "size_add",
  risk_exposure_increased: "risk_increase",
  oversized_exposure_increase: "risk_increase",
  averaging_down: "averaging",
};

const MERGE_WINDOW_MS = 15_000;

type WipEntry = TradeTimelineEntry & { mergeKey: string | null };

// Walks chronologically-sorted entries and folds adjacent same-key rows
// inside the merge window into one. Behavior-source rows win the title;
// the monitoring-source description is preserved as supplementary
// detail (rendered on a second line in the row).
function mergeAdjacentDuplicates(entries: WipEntry[]): WipEntry[] {
  const out: WipEntry[] = [];
  for (const e of entries) {
    const prev = out[out.length - 1];
    const canMerge =
      prev &&
      e.mergeKey != null &&
      prev.mergeKey === e.mergeKey &&
      new Date(e.timestamp).getTime() -
        new Date(prev.timestamp).getTime() <=
        MERGE_WINDOW_MS;
    if (!canMerge) {
      out.push(e);
      continue;
    }
    // Combine. Pick the most specific title (behavior-source is the
    // narrative version; monitoring-source carries the delta). Keep
    // the behavior-source title when both kinds are present; lift the
    // OTHER row's description into a "detail" line so the engine's
    // specific delta survives.
    const behaviorRow =
      prev.source === "behavior" ? prev : e.source === "behavior" ? e : null;
    const monitoringRow =
      prev.source === "monitoring"
        ? prev
        : e.source === "monitoring"
          ? e
          : null;
    const head = behaviorRow ?? prev;
    const tail = behaviorRow === prev ? e : prev;
    // The supplementary detail is the monitoring row's description if
    // we have one — that's where the delta lives. Otherwise fall back
    // to the other row's description.
    const supplement = monitoringRow?.description ?? tail.description;
    const merged: WipEntry = {
      ...head,
      // Highest severity wins. Pressure is recomputed in a later pass.
      severity:
        SEVERITY_WEIGHT[e.severity] > SEVERITY_WEIGHT[prev.severity]
          ? e.severity
          : prev.severity,
      description:
        supplement && supplement !== head.description
          ? `${head.description} · ${supplement}`
          : head.description,
    };
    out[out.length - 1] = merged;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Builder
// -----------------------------------------------------------------------------

export function buildTradeTimeline(
  behaviorEvents: BehaviorEvent[],
  monitoringEvents: MonitoringEvent[],
  interventions: InterventionEvent[],
): TradeTimelineEntry[] {
  const wip: WipEntry[] = [];

  for (const e of behaviorEvents) {
    const display = BEHAVIOR_EVENT_DISPLAY[e.eventType];
    wip.push({
      id: `b-${e.id}`,
      source: "behavior",
      eventType: e.eventType,
      timestamp: e.timestamp,
      title: e.displayTitle || display?.displayTitle || e.eventType,
      description:
        e.displayDescription ||
        display?.displayDescription ||
        e.eventType.replace(/_/g, " "),
      severity: BEHAVIOR_EVENT_TO_SEVERITY[e.severity] ?? "info",
      category: categoryForBehaviorEvent(e),
      pressure: "stable",
      mergeKey: BEHAVIOR_MERGE_KEY[e.eventType] ?? null,
    });
  }

  for (const m of monitoringEvents) {
    const top = m.deviations[0];
    const headline = top?.description ?? "Deviation event";
    wip.push({
      id: `m-${m.id}`,
      source: "monitoring",
      eventType: top?.type,
      timestamp: m.timestamp,
      title: headline,
      description: `${m.deviations.length} deviation${m.deviations.length === 1 ? "" : "s"} logged · ${m.severity}`,
      severity: DEVIATION_TO_SEVERITY[m.severity] ?? "info",
      category: categoryForMonitoringEvent(m),
      pressure: "stable",
      mergeKey: top ? (DEVIATION_MERGE_KEY[top.type] ?? null) : null,
    });
  }

  for (const i of interventions) {
    let title: string;
    let severity: TradeTimelineSeverity;
    let description: string;
    if (i.decision === "continue_anyway") {
      title = "Override accepted";
      severity = i.severity === "violation" ? "critical" : "warning";
      description = `Overrode ${i.warningCount ?? 0} warning${(i.warningCount ?? 0) === 1 ? "" : "s"} and ${i.violationCount ?? 0} violation${(i.violationCount ?? 0) === 1 ? "" : "s"} on this setup.`;
    } else if (i.decision === "revise_trade") {
      title = "Trade revised";
      severity = "info";
      description = "Returned to the plan after the rule check.";
    } else {
      title = "Trade canceled";
      severity = "info";
      description = "Setup discarded after the rule check.";
    }
    wip.push({
      id: `i-${i.id}`,
      source: "intervention",
      eventType: i.decision,
      timestamp: i.timestamp,
      title,
      description,
      severity,
      category: categoryForIntervention(),
      pressure: "stable",
      mergeKey: null,
    });
  }

  wip.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const merged = mergeAdjacentDuplicates(wip);

  // Second pass: compute running pressure. Score accumulates across the
  // trade — each row reflects the trader's behavioral pressure AFTER
  // this event lands.
  let score = 0;
  for (const entry of merged) {
    score += SEVERITY_WEIGHT[entry.severity];
    entry.pressure = pressureFromScore(score);
  }

  // Strip the internal mergeKey field — consumers don't need it.
  return merged.map(({ mergeKey: _drop, ...rest }) => {
    void _drop;
    return rest;
  });
}

// -----------------------------------------------------------------------------
// Escalation anchor
//
// The "moment discipline shifted" — the first event that meaningfully
// changed the behavioral arc. Used by EscalationAnchorCard above the
// timeline. Picks the EARLIEST entry whose severity reaches warning OR
// whose category indicates rule defiance / escalation, since those are
// the moments the trader's behavioral integrity actually moved.
//
// Returns null when no anchor exists — clean trades have no shift.
// -----------------------------------------------------------------------------

export type EscalationAnchor = {
  entry: TradeTimelineEntry;
  narrative: string;
};

const ANCHOR_NARRATIVE: Partial<Record<TradeEventCategory, string>> = {
  rule_violation: "Discipline shifted when a rule was broken mid-trade.",
  escalation: "Behavior began escalating from this moment.",
  intervention: "Risk escalation began after the intervention override.",
  risk: "Behavior shifted when risk crept beyond the approved plan.",
  position_management:
    "Position discipline shifted when size moved off the plan.",
};

export function findEscalationAnchor(
  entries: TradeTimelineEntry[],
): EscalationAnchor | null {
  for (const entry of entries) {
    if (entry.severity === "info") continue;
    if (entry.severity === "caution") continue;
    const narrative =
      ANCHOR_NARRATIVE[entry.category] ??
      `Discipline shifted when ${entry.title.toLowerCase()}.`;
    return { entry, narrative };
  }
  return null;
}

// -----------------------------------------------------------------------------
// Renderer
// -----------------------------------------------------------------------------

export function TradeBehaviorTimeline({
  entries,
  emptyLabel = "No behavioral events recorded for this trade.",
}: {
  entries: TradeTimelineEntry[];
  emptyLabel?: string;
}) {
  return (
    <section
      aria-label="Trade behavior timeline"
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/40 p-5 backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Behavioral Timeline
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground/60">
          {entries.length} event{entries.length === 1 ? "" : "s"}
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-background/20 p-4 text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry, idx) => {
            const isLast = idx === entries.length - 1;
            const Icon =
              entry.source === "behavior"
                ? (EVENT_TYPE_ICON[entry.eventType ?? ""] ??
                  iconForSeverity(entry.severity))
                : iconForSeverity(entry.severity);
            const gap =
              idx > 0
                ? elapsedLabel(entries[idx - 1].timestamp, entry.timestamp)
                : null;
            const showPressureShift =
              idx === 0 || entries[idx - 1].pressure !== entry.pressure;
            return (
              <li key={entry.id} className="flex gap-3">
                <div className="flex w-14 shrink-0 flex-col items-end pt-1 leading-tight">
                  <span className="text-[0.65rem] tabular-nums text-muted-foreground">
                    {formatTime(entry.timestamp)}
                  </span>
                  {gap ? (
                    <span className="mt-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground/60">
                      {gap}
                    </span>
                  ) : null}
                </div>

                {/* Marker + connecting rail. Rail tone shifts with the
                    running pressure level so the visual signal carries
                    "the trade got hotter here" without adding
                    interactive elements. */}
                <div className="relative flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full ring-1",
                      SEVERITY_RING[entry.severity],
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {!isLast ? (
                    <span
                      className={cn(
                        "mt-1 w-px flex-1 min-h-4 opacity-70",
                        PRESSURE_BAR_TONE[entry.pressure],
                      )}
                    />
                  ) : null}
                </div>

                <div
                  className={cn(
                    "flex flex-1 flex-col gap-1 leading-tight",
                    isLast ? "pb-0" : "pb-3",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        SEVERITY_DOT[entry.severity],
                      )}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {entry.title}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] ring-1",
                        categoryTone(entry.category),
                      )}
                    >
                      {categoryLabel(entry.category)}
                    </span>
                    <span
                      className={cn(
                        "text-[0.55rem] font-semibold uppercase tracking-[0.16em]",
                        SEVERITY_LABEL_TONE[entry.severity],
                      )}
                    >
                      · {SEVERITY_LABEL[entry.severity]}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {entry.description}
                  </span>
                  {/* Pressure shift marker — only renders when the row
                      moves the pressure level, so the timeline stays
                      readable. */}
                  {showPressureShift && entry.pressure !== "stable" ? (
                    <span
                      className={cn(
                        "mt-1 inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] ring-1",
                        PRESSURE_TONE[entry.pressure],
                      )}
                    >
                      Pressure · {PRESSURE_LABEL[entry.pressure]}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function iconForSeverity(severity: TradeTimelineSeverity): LucideIcon {
  if (severity === "critical" || severity === "warning") return AlertTriangle;
  if (severity === "caution") return Info;
  return CheckCircle2;
}
