import { CheckCircle2 } from "lucide-react";

import { RULES_STATUS } from "@/features/dashboard/mock-data";

export function RulesRiskStatus() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Rules &amp; Risk Status
        </span>
        <button
          type="button"
          className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand transition-colors hover:text-brand/80"
        >
          Review All
        </button>
      </div>

      <p className="text-sm font-semibold text-emerald-400">
        {RULES_STATUS.configured} / {RULES_STATUS.total} Rules Configured
      </p>

      <ul className="flex flex-col gap-2.5">
        {RULES_STATUS.rules.map(({ label, value }) => (
          <li key={label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span className="text-foreground/85">{label}</span>
            </span>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {value}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-2 rounded-md border border-brand/40 bg-brand/[0.06] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand transition-colors hover:bg-brand/[0.12]"
      >
        Review Rules &amp; Risk
      </button>
    </div>
  );
}
