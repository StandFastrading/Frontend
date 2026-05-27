"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  Flag,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";

import { buildSessionReplay } from "@/lib/analytics/session-replay-builder";
import type {
  ReplayEvent,
  ReplayEventSeverity,
  ReplayEventSource,
} from "@/lib/analytics/session-replay-builder";
import { sessionsInWindow } from "@/lib/analytics/trend-series";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { cn } from "@/lib/utils";

// SECTION 4 — Session Replay Timeline
//
// Lets the trader pick a session from the timeframe and walk the unified
// event timeline (behavior events + interventions + monitoring deviations
// + synthesized state transitions). The "behavioral black box recording."

const SOURCE_ICON: Record<ReplayEventSource, LucideIcon> = {
  behavior: AlertTriangle,
  intervention: Flag,
  monitoring: ShieldCheck,
  state_transition: Brain,
};

const SEVERITY_DOT: Record<ReplayEventSeverity, string> = {
  info: "bg-emerald-400",
  caution: "bg-amber-400",
  warning: "bg-rose-400",
  critical: "bg-rose-300",
};

const SEVERITY_TEXT: Record<ReplayEventSeverity, string> = {
  info: "text-emerald-300",
  caution: "text-amber-300",
  warning: "text-rose-300",
  critical: "text-rose-200",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export function SessionReplaySection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();

  const sessions = useMemo(
    () =>
      sessionsInWindow(inputs.sessions, timeframe, nowMs)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        ),
    [inputs, timeframe, nowMs],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeSessionId = selectedId ?? sessions[0]?.sessionId ?? null;
  const selectedSession = sessions.find((s) => s.sessionId === activeSessionId);

  const replay = useMemo(() => {
    if (!selectedSession) return null;
    return buildSessionReplay(selectedSession, {
      behaviorEvents: inputs.behaviorEvents,
      monitoringEvents: inputs.monitoringEvents,
      interventions: inputs.interventions,
      closedTrades: inputs.closedTrades,
      riskRules: inputs.riskRules,
      liveSessionMetrics: inputs.liveSessionMetrics,
    });
  }, [selectedSession, inputs]);

  return (
    <section
      aria-label="Session replay"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Session Replay
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/15 bg-card/60 p-5 backdrop-blur lg:grid-cols-[260px_1fr]">
        {/* Session picker */}
        <div className="flex flex-col gap-2">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
            Sessions
          </span>
          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 p-3 text-[0.7rem] text-muted-foreground">
              No sessions in window.
            </div>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <li key={s.sessionId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.sessionId)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                      s.sessionId === activeSessionId
                        ? "border-brand/40 bg-brand/[0.06] text-foreground"
                        : "border-white/10 bg-background/30 text-muted-foreground hover:border-white/20 hover:text-foreground",
                    )}
                  >
                    <span className="font-semibold text-foreground">
                      {formatDate(s.startedAt)}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      Started {formatTime(s.startedAt)} ·{" "}
                      {s.status === "active" ? "Active" : "Closed"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-3">
          {replay == null ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
              Select a session to replay its behavioral timeline.
            </div>
          ) : replay.events.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
              No behavioral events recorded for this session.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-background/20 px-3 py-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                <span>
                  Peak state ·{" "}
                  <span className="text-foreground/85">{replay.peakState}</span>
                </span>
                <span>
                  Peak severity ·{" "}
                  <span className={SEVERITY_TEXT[replay.peakSeverity]}>
                    {replay.peakSeverity}
                  </span>
                </span>
                <span>{replay.events.length} events</span>
              </div>
              <ul className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto pr-1">
                {replay.events.map((event) => (
                  <ReplayRow key={event.id} event={event} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ReplayRow({ event }: { event: ReplayEvent }) {
  const Icon =
    event.source === "state_transition"
      ? Brain
      : event.source === "intervention"
        ? Flag
        : event.source === "monitoring"
          ? Timer
          : SOURCE_ICON[event.source];
  return (
    <li className="flex gap-3">
      <div className="flex w-16 shrink-0 flex-col items-end gap-1 pt-1 leading-tight">
        <span className="text-[0.65rem] tabular-nums text-muted-foreground">
          {formatTime(event.timestamp)}
        </span>
        <span
          className={cn(
            "size-1.5 rounded-full",
            SEVERITY_DOT[event.severity],
          )}
        />
      </div>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full ring-1",
          event.severity === "info"
            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
            : event.severity === "caution"
              ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
              : event.severity === "warning"
                ? "bg-rose-500/15 text-rose-300 ring-rose-500/30"
                : "bg-rose-500/20 text-rose-200 ring-rose-500/40",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex flex-1 flex-col gap-0.5 leading-tight">
        <span className="text-sm font-medium text-foreground">
          {event.title}
        </span>
        <span className="text-xs text-muted-foreground">
          {event.description}
        </span>
      </div>
    </li>
  );
}
