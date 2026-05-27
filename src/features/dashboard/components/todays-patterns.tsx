"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Timer,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

import {
  BEHAVIOR_CLUSTER_LABEL,
  useBehavioralDetection,
  type BehavioralDetection,
  type BehavioralState,
  type BehaviorCluster,
  type DetectionId,
  type DetectionSeverity,
} from "@/lib/detection/behavioral-detection-engine";
import { cn } from "@/lib/utils";

// Today's Patterns is the dashboard's read on the Behavioral Detection
// Engine. The card structure (label + icon + title + value rows) is
// preserved; the content is now the engine's active detections, sorted by
// severity descending. When no detection fires, a calm focused-state block
// fills the body instead of fake placeholder patterns.

const DETECTION_ICON: Record<DetectionId, LucideIcon> = {
  revenge_trading: Activity,
  position_size_escalation: TrendingDown,
  rapid_reentry: Timer,
  stop_widening: ShieldAlert,
  intervention_override: AlertTriangle,
  overtrading: AlertCircle,
};

const SEVERITY_RING: Record<DetectionSeverity, string> = {
  info: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  caution: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  warning: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  critical: "bg-rose-500/20 text-rose-200 ring-rose-500/50",
};

const SEVERITY_LABEL: Record<DetectionSeverity, string> = {
  info: "Info",
  caution: "Caution",
  warning: "Warning",
  critical: "Critical",
};

const SEVERITY_BADGE_TEXT: Record<DetectionSeverity, string> = {
  info: "text-emerald-300",
  caution: "text-amber-300",
  warning: "text-rose-300",
  critical: "text-rose-200",
};

const STATE_LABEL: Record<BehavioralState, string> = {
  focused: "Focused",
  controlled: "Controlled",
  reactive: "Reactive",
  escalating: "Escalating",
  impulsive: "Impulsive",
  fatigued: "Fatigued",
};

const STATE_TONE: Record<BehavioralState, string> = {
  focused: "text-emerald-300",
  controlled: "text-emerald-300",
  reactive: "text-amber-300",
  escalating: "text-rose-300",
  impulsive: "text-rose-300",
  fatigued: "text-rose-300",
};

export function TodaysPatterns() {
  const reading = useBehavioralDetection();

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-white/10 bg-card/40 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col leading-tight">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Today&rsquo;s Patterns
          </span>
          <span className="text-[0.6rem] tracking-[0.05em] text-muted-foreground/70">
            Behavioral detection ·{" "}
            <span className={STATE_TONE[reading.behavioralState]}>
              {STATE_LABEL[reading.behavioralState]}
            </span>
          </span>
        </div>
        <span
          className={cn(
            "rounded-full bg-foreground/[0.05] px-2.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/10 tabular-nums",
            reading.detections.length === 0
              ? "text-muted-foreground"
              : SEVERITY_BADGE_TEXT[reading.dominantSeverity],
          )}
        >
          {reading.detections.length === 0
            ? "Clear"
            : `${reading.detections.length} active`}
        </span>
      </div>

      {reading.detections.length === 0 ? (
        <FocusedState />
      ) : (
        <DetectionGroupedList
          detections={reading.detections}
          activeClusterIds={
            new Set(reading.activeClusters.map((c) => c.cluster))
          }
        />
      )}

      <button
        type="button"
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        View Full Analysis
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}

// Renders detections grouped by cluster. When 2+ detections share a
// cluster, a small cluster header is shown above the group so the trader
// reads them as one behavioral arc, not disconnected alerts. Single-
// detection clusters render without a header. Cluster order is preserved
// from the reading (already sorted by cluster dominant severity desc).
function DetectionGroupedList({
  detections,
  activeClusterIds,
}: {
  detections: BehavioralDetection[];
  activeClusterIds: Set<BehaviorCluster>;
}) {
  // Walk the pre-sorted detections (already arranged so cluster members
  // are adjacent). Build render-ready groups.
  type Group = { cluster: BehaviorCluster; items: BehavioralDetection[] };
  const groups: Group[] = [];
  for (const d of detections) {
    const last = groups[groups.length - 1];
    if (last && last.cluster === d.cluster) {
      last.items.push(d);
    } else {
      groups.push({ cluster: d.cluster, items: [d] });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, idx) => {
        const isActiveCluster = activeClusterIds.has(group.cluster);
        return (
          <div key={`${group.cluster}-${idx}`} className="flex flex-col gap-2">
            {isActiveCluster ? (
              <div className="flex items-center gap-2 pl-1">
                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                  {BEHAVIOR_CLUSTER_LABEL[group.cluster]} ·{" "}
                  <span className="text-foreground/70">cluster active</span>
                </span>
                <span
                  aria-hidden
                  className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
                />
              </div>
            ) : null}
            <ul className="flex flex-col gap-3">
              {group.items.map((d) => (
                <DetectionRow key={d.id} detection={d} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function DetectionRow({ detection }: { detection: BehavioralDetection }) {
  const Icon = DETECTION_ICON[detection.id];
  const [topReason] = detection.reasons;
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full ring-1",
          SEVERITY_RING[detection.severity],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex flex-1 flex-col gap-0.5 leading-tight">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">
            {detection.headline}
          </span>
          <span
            className={cn(
              "rounded-full bg-foreground/[0.05] px-1.5 py-px text-[0.5rem] font-semibold uppercase tracking-[0.18em] ring-1 ring-white/10",
              SEVERITY_BADGE_TEXT[detection.severity],
            )}
          >
            {SEVERITY_LABEL[detection.severity]}
          </span>
        </div>
        {topReason ? (
          <span className="text-xs text-muted-foreground">{topReason}</span>
        ) : null}
      </div>
    </li>
  );
}

function FocusedState() {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
        <CheckCircle2 className="size-4" />
      </span>
      <div className="flex flex-col gap-1 leading-snug">
        <span className="text-sm font-semibold text-foreground">
          No behavioral patterns detected
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Session is reading as focused. Detections will surface here as
          trades, warnings, and decisions accumulate.
        </p>
      </div>
    </div>
  );
}
