import { OPEN_POSITIONS, POSITIONS_TOTAL_R } from "@/features/dashboard/mock-data";
import { cn } from "@/lib/utils";

function formatR(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
}

export function OpenPositions() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Open Positions
        </span>
        <button
          type="button"
          className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand transition-colors hover:text-brand/80"
        >
          View All
        </button>
      </div>

      <ul className="flex flex-col gap-3">
        {OPEN_POSITIONS.map(({ ticker, direction, size, rValue }) => (
          <li key={ticker} className="flex items-center justify-between gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">
                {ticker}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">
                {direction} · {size}
              </span>
            </div>
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                rValue >= 0 ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {formatR(rValue)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Total
        </span>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            POSITIONS_TOTAL_R >= 0 ? "text-emerald-400" : "text-rose-400",
          )}
        >
          {formatR(POSITIONS_TOTAL_R)}
        </span>
      </div>
    </div>
  );
}
