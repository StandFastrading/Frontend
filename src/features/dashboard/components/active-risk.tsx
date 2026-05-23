import { ArrowRight } from "lucide-react";

import { ACTIVE_RISK } from "@/features/dashboard/mock-data";

function RBar({
  current,
  max,
  percent,
  variant,
}: {
  current: number;
  max: number;
  percent: number;
  variant: "brand" | "rose";
}) {
  const barColor = variant === "brand" ? "bg-brand" : "bg-rose-500";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold leading-none tabular-nums text-foreground">
          {current.toFixed(2)}R
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            / {max.toFixed(2)}R
          </span>
        </span>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {percent}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function ActiveRisk() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Active Risk
      </span>

      <div className="flex flex-col gap-4">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Daily Risk Usage
        </span>
        <RBar
          current={ACTIVE_RISK.dailyUsage.current}
          max={ACTIVE_RISK.dailyUsage.max}
          percent={ACTIVE_RISK.dailyUsage.percent}
          variant="brand"
        />
      </div>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">Open Risk</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {ACTIVE_RISK.openRisk.toFixed(2)}R
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-muted-foreground">Potential Risk</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {ACTIVE_RISK.potentialRisk.toFixed(2)}R
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-4 border-t border-border/40 pt-4">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Max Daily Loss
        </span>
        <RBar
          current={ACTIVE_RISK.maxDailyLoss.current}
          max={ACTIVE_RISK.maxDailyLoss.max}
          percent={ACTIVE_RISK.maxDailyLoss.percent}
          variant="rose"
        />
      </div>

      <button
        type="button"
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        Risk Limits
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
