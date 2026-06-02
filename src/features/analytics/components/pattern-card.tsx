import { Activity } from "lucide-react";

import {
  PATTERN_CONFIDENCE_LABEL,
  type BehavioralPattern,
  type PatternConfidence,
  type PatternSeverity,
} from "@/lib/patterns/behavioral-pattern-engine";
import { cn } from "@/lib/utils";

// Reusable card for cross-session behavioral patterns. Tone is deliberately
// muted — the engine speaks observationally, not therapeutically. Severity
// drives the frame; confidence is its own pill so a low-confidence pattern
// never visually impersonates a strong one.

const FRAME: Record<PatternSeverity, string> = {
  info: "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.10] to-emerald-500/[0.02] shadow-[0_0_30px_-12px_rgba(16,185,129,0.45)]",
  caution: "border-amber-500/45 bg-gradient-to-br from-amber-500/[0.12] to-amber-500/[0.02] shadow-[0_0_30px_-12px_rgba(245,158,11,0.45)]",
  warning: "border-rose-500/45 bg-gradient-to-br from-rose-500/[0.13] to-rose-500/[0.03] shadow-[0_0_32px_-12px_rgba(244,63,94,0.5)]",
  critical: "border-rose-500/60 bg-gradient-to-br from-rose-500/[0.18] to-rose-500/[0.04] shadow-[0_0_36px_-10px_rgba(244,63,94,0.6)]",
};

const SEVERITY_LABEL: Record<PatternSeverity, string> = {
  info: "Info",
  caution: "Caution",
  warning: "Warning",
  critical: "Critical",
};

const SEVERITY_TEXT: Record<PatternSeverity, string> = {
  info: "text-emerald-300/95",
  caution: "text-amber-300/95",
  warning: "text-rose-300/95",
  critical: "text-rose-200",
};

const CONFIDENCE_TEXT: Record<PatternConfidence, string> = {
  low: "text-muted-foreground/85",
  moderate: "text-foreground",
  high: "text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.55)]",
};

function formatRelative(iso: string | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const delta = Date.now() - t;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} min ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} h ago`;
  return `${Math.floor(delta / 86_400_000)} d ago`;
}

export function PatternCard({ pattern }: { pattern: BehavioralPattern }) {
  return (
    <article
      aria-label={pattern.title}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur",
        FRAME[pattern.severity],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 leading-tight">
          <h4
            className={cn(
              "font-semibold text-foreground",
              pattern.category === "time_of_day"
                ? "text-sm uppercase tracking-[0.14em]"
                : "text-base",
            )}
          >
            {pattern.title}
          </h4>
          <div className="flex flex-wrap items-center gap-1.5 text-[0.7rem] font-medium">
            <span className={SEVERITY_TEXT[pattern.severity]}>
              {SEVERITY_LABEL[pattern.severity]}
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span className={CONFIDENCE_TEXT[pattern.confidence]}>
              {PATTERN_CONFIDENCE_LABEL[pattern.confidence]}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {pattern.occurrenceCount}
          </span>
          <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/80">
            Occurrences
          </span>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-foreground/85">
        {pattern.description}
      </p>

      {pattern.conditions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {pattern.conditions.map((c) => (
            <span
              key={c.kind}
              className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground/80 ring-1 ring-white/10"
            >
              <Activity className="size-2.5" />
              {c.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[0.65rem] text-muted-foreground">
        <span>
          {pattern.sessionCount} session{pattern.sessionCount === 1 ? "" : "s"}
          {" · "}
          {pattern.timeWindowLabel}
        </span>
        {pattern.lastObservedAt ? (
          <span>Last: {formatRelative(pattern.lastObservedAt)}</span>
        ) : null}
      </div>
    </article>
  );
}
