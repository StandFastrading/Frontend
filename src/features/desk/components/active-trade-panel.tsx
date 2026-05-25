import {
  Activity,
  Flag,
  LogOut,
  Move,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";

export function ActiveTradePanel() {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-dashed border-white/15 bg-card/40 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Active Trade Monitoring
        </span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          No Active Trade
        </span>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-background/30 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-muted-foreground ring-1 ring-white/10">
          <Activity className="size-4" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Once a trade is approved or logged, active trade behavior will appear
          here — open risk, distance to stop, time in trade, and behavioral
          deviations from your plan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DisabledAction icon={LogOut} label="Log Exit" />
        <DisabledAction icon={Move} label="Move Stop" />
        <DisabledAction icon={PlusCircle} label="Add Position" />
        <DisabledAction icon={Flag} label="Mark Mistake" />
      </div>
    </div>
  );
}

function DisabledAction({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled
      className="flex cursor-not-allowed flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-background/30 px-3 py-3 text-xs font-semibold text-muted-foreground"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
