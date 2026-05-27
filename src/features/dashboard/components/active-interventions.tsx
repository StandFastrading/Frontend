"use client";

import { ArrowRight, Clock, ShieldCheck } from "lucide-react";

import {
  useActiveInterventions,
  type ActiveInterventionRecord,
  type ActiveInterventionSeverity,
} from "@/lib/interventions/active-interventions-engine";
import { cn } from "@/lib/utils";

// Live mirror of the Active Interventions Engine. Mock data is gone —
// every row + countdown is derived in real time from session metrics +
// closed trades + risk rules. The engine ticks every 15 seconds so "ends
// in X min" advances smoothly toward expiry without requiring a new
// event. Each row exposes `violationCount` so the UI can tone the row up
// if the trader has already re-entered during the lock.

const SEVERITY_FRAME: Record<
  ActiveInterventionSeverity,
  { card: string; icon: string; iconText: string; remainingText: string }
> = {
  caution: {
    card: "border-amber-500/30 bg-amber-500/[0.05]",
    icon: "bg-amber-500/15 ring-amber-500/30",
    iconText: "text-amber-300",
    remainingText: "text-amber-300",
  },
  warning: {
    card: "border-rose-500/30 bg-rose-500/[0.06]",
    icon: "bg-rose-500/15 ring-rose-500/30",
    iconText: "text-rose-300",
    remainingText: "text-rose-300",
  },
  critical: {
    card: "border-rose-500/50 bg-rose-500/[0.09]",
    icon: "bg-rose-500/20 ring-rose-500/50",
    iconText: "text-rose-200",
    remainingText: "text-rose-200",
  },
};

function formatTriggered(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Triggered: —";
  return `Triggered ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function ActiveInterventions() {
  const interventions = useActiveInterventions();

  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex flex-col gap-1">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Active Interventions
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            interventions.length === 0 ? "text-emerald-400" : "text-rose-400",
          )}
        >
          {interventions.length === 0
            ? "None active"
            : `${interventions.length} Active`}
        </span>
      </div>

      {interventions.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {interventions.map((record) => (
            <InterventionRow key={record.id} record={record} />
          ))}
        </ul>
      )}

      <button
        type="button"
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        View All Interventions
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}

function InterventionRow({ record }: { record: ActiveInterventionRecord }) {
  const frame = SEVERITY_FRAME[record.severity];
  const Icon = record.icon;
  return (
    <li
      className={cn(
        "flex gap-3 rounded-lg border p-3",
        frame.card,
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full ring-1",
          frame.icon,
          frame.iconText,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex flex-1 flex-col gap-0.5 leading-tight">
        <span className="text-sm font-semibold text-foreground">
          {record.title}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTriggered(record.triggeredAt)}
        </span>
        <span className="text-xs text-muted-foreground/90">
          {record.description}
        </span>
        <span
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            frame.remainingText,
          )}
        >
          <Clock className="size-3" />
          {record.remainingLabel}
        </span>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-start gap-3 rounded-lg border border-dashed border-white/10 bg-background/20 px-4 py-5">
      <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">
        <ShieldCheck className="size-4" />
      </span>
      <div className="flex flex-col gap-1 leading-tight">
        <span className="text-sm font-semibold text-foreground">
          No active interventions
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Cooldowns and lockouts will appear here when triggered by losing
          trades, consecutive-loss streaks, or daily-cap breaches.
        </p>
      </div>
    </div>
  );
}
