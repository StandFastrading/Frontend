"use client";

import { Brain } from "lucide-react";

import {
  TIMEFRAMES,
  TIMEFRAME_IDS,
  useTimeframe,
  type TimeframeId,
} from "@/lib/analytics/timeframe";
import { cn } from "@/lib/utils";

// Top-of-page header. Title + subtitle + segmented timeframe switcher.
// Matches the dashboard's premium dark aesthetic — no extra decoration.

export function AnalyticsHeader() {
  const { timeframe, setTimeframeId } = useTimeframe();
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <Brain className="size-3.5 text-brand" />
          Behavior Analytics
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Behavioral Operating System
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          What behavioral conditions produce the trader&rsquo;s worst
          decisions? Every metric on this page is derived from observed
          events — no inference, no P/L weighting.
        </p>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-card/40 p-1 backdrop-blur">
        {TIMEFRAME_IDS.map((id: TimeframeId) => {
          const active = timeframe.id === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTimeframeId(id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition-colors",
                active
                  ? "bg-foreground/10 text-foreground ring-1 ring-white/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {TIMEFRAMES[id].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
