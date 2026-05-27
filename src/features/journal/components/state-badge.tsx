import { cn } from "@/lib/utils";

// Severity-toned state pill used across the Journal tabs (Daily
// Reflection summary card, History card, etc.). Accepts the state's
// wire id (`focused` ... `locked_down`) and renders the human label
// with the appropriate severity tone. Falls back gracefully for
// unknown states (history records persisted under older vocabularies).

const STATE_LABEL: Record<string, string> = {
  focused: "Focused",
  controlled: "Controlled",
  stable: "Stable",
  overtrading: "Overtrading",
  escalating: "Escalating",
  reactive: "Reactive",
  impulsive: "Impulsive",
  fatigued: "Fatigued",
  locked_down: "Locked Down",
};

const STATE_TONE: Record<string, string> = {
  focused: "text-emerald-300 ring-emerald-500/30 bg-emerald-500/10",
  controlled: "text-emerald-300 ring-emerald-500/30 bg-emerald-500/10",
  stable: "text-brand ring-brand/30 bg-brand/10",
  overtrading: "text-brand ring-brand/30 bg-brand/10",
  escalating: "text-amber-300 ring-amber-500/30 bg-amber-500/10",
  reactive: "text-amber-300 ring-amber-500/30 bg-amber-500/10",
  impulsive: "text-rose-300 ring-rose-500/30 bg-rose-500/10",
  fatigued: "text-rose-300 ring-rose-500/30 bg-rose-500/10",
  locked_down: "text-rose-200 ring-rose-500/45 bg-rose-500/15",
};

export function StateBadge({
  state,
  className,
}: {
  state: string;
  className?: string;
}) {
  const label = STATE_LABEL[state] ?? state.replace(/_/g, " ");
  const tone = STATE_TONE[state] ?? "text-muted-foreground ring-white/10 bg-foreground/[0.05]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
