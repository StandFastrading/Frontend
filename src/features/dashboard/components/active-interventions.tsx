import { ArrowRight, Clock } from "lucide-react";

import { ACTIVE_INTERVENTIONS } from "@/features/dashboard/mock-data";

export function ActiveInterventions() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex flex-col gap-1">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Active Interventions
        </span>
        <span className="text-sm font-semibold text-rose-400">
          {ACTIVE_INTERVENTIONS.length} Active
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {ACTIVE_INTERVENTIONS.map(({ icon: Icon, title, triggeredAt, endsIn }) => (
          <li
            key={title}
            className="flex gap-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] p-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
              <Icon className="size-4" />
            </span>
            <div className="flex flex-1 flex-col gap-0.5 leading-tight">
              <span className="text-sm font-semibold text-foreground">
                {title}
              </span>
              <span className="text-xs text-muted-foreground">
                {triggeredAt}
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs text-rose-300">
                <Clock className="size-3" />
                {endsIn}
              </span>
            </div>
          </li>
        ))}
      </ul>

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
