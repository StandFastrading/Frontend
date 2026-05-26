"use client";

import { ArrowRight } from "lucide-react";

import {
  BEHAVIOR_EVENT_DISPLAY,
  type BehaviorEventTone,
} from "@/lib/behavior-events";
import { useCurrentSessionEvents } from "@/lib/sessions/session-helpers";
import { cn } from "@/lib/utils";

// Dashboard's read-only mirror of the Trade Desk behavior feed. Reads
// directly from the centralized `behaviorEvents` slice — no mock data, no
// local state, no business logic.

const TONE: Record<BehaviorEventTone, string> = {
  rose: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
  emerald: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  brand: "bg-brand/15 text-brand ring-brand/30",
};

const DOT_TONE: Record<BehaviorEventTone, string> = {
  rose: "bg-rose-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  brand: "bg-brand",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BehaviorFeed() {
  // Session-scoped — historical events stay in the store but the dashboard
  // feed defaults to today's activity. Trade History / Reports will get an
  // unscoped variant when they're built.
  const events = useCurrentSessionEvents();

  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Behavior Feed
        </span>
        <span className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand/60" />
            <span className="relative size-2 rounded-full bg-brand" />
          </span>
          Live
        </span>
      </div>

      <ul className="flex flex-col gap-4">
        {events.slice(0, 6).map((entry) => {
          const display = BEHAVIOR_EVENT_DISPLAY[entry.eventType];
          const Icon = display.icon;
          const tone = display.tone;
          return (
            <li key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    DOT_TONE[tone],
                  )}
                />
                <span className="w-14 text-[0.65rem] tabular-nums text-muted-foreground">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full ring-1",
                  TONE[tone],
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="flex flex-1 flex-col gap-0.5 leading-tight">
                <span className="text-sm font-semibold text-foreground">
                  {entry.displayTitle}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.displayDescription}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        View Full Behavior Log
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
