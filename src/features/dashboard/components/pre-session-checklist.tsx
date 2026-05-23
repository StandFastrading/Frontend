import { ArrowRight, CheckCircle2 } from "lucide-react";

import { PRE_SESSION_CHECKLIST } from "@/features/dashboard/mock-data";

export function PreSessionChecklist() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Pre-Session Checklist
        </span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-emerald-400">
          {PRE_SESSION_CHECKLIST.completed} / {PRE_SESSION_CHECKLIST.total}{" "}
          Completed
        </span>
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
