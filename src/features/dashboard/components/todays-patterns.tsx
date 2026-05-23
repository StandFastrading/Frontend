import { ArrowRight } from "lucide-react";

import { TODAYS_PATTERNS } from "@/features/dashboard/mock-data";
import { cn } from "@/lib/utils";

const TONE: Record<"rose" | "amber" | "neutral", string> = {
  rose: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
  amber: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  neutral: "bg-brand/15 text-brand ring-brand/30",
};

export function TodaysPatterns() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Today&rsquo;s Patterns
      </span>

      <ul className="flex flex-col gap-4">
        {TODAYS_PATTERNS.map(({ icon: Icon, tone, title, value }) => (
          <li key={title} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full ring-1",
                TONE[tone],
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="flex flex-1 flex-col leading-tight">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {title}
              </span>
              <span className="text-sm font-medium text-foreground">
                {value}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        View Full Analysis
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
