"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";

import { useActiveSession } from "@/lib/sessions/session-helpers";
import { PRE_SESSION_CHECKLIST } from "@/features/dashboard/mock-data";

function formatSessionLabel(tradingDate: string | undefined): string {
  if (!tradingDate) return "—";
  const d = new Date(tradingDate);
  if (Number.isNaN(d.getTime())) return tradingDate;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PreSessionChecklist() {
  const activeSession = useActiveSession();

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-white/10 bg-card/40 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Pre-Session Checklist
        </span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-emerald-400">
          {PRE_SESSION_CHECKLIST.completed} / {PRE_SESSION_CHECKLIST.total}{" "}
          Completed
        </span>
      </div>

      {/* Active session marker — surfaces the boundary so the trader can
          tell at a glance whether the dashboard numbers belong to today or
          a session left open from yesterday. The Start New Session action
          lives in the dashboard header so there's a single source of
          truth. */}
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-3 py-2.5">
        <div className="flex flex-col leading-tight">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Active Session
          </span>
          <span className="text-xs font-semibold text-foreground">
            {activeSession
              ? formatSessionLabel(activeSession.tradingDate)
              : "No session"}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {PRE_SESSION_CHECKLIST.items.map(({ label, value }) => (
          <li key={label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span className="text-foreground/85">{label}</span>
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {value}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        Review Rules &amp; Risk
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
