import {
  labelForClassification,
  severityForClassification,
  type TradeClassification,
  type TradeClassificationSeverity,
} from "@/lib/journal/trade-classification";
import { cn } from "@/lib/utils";

// SECTION 2 — Trade Behavioral Classification
//
// Renders the dominant classification + any secondary tags returned by
// the classification engine. Tone matches the severity: emerald (info)
// → amber (caution) → rose (warning) → deep rose (critical).

const FRAME: Record<TradeClassificationSeverity, string> = {
  info: "border-emerald-500/25 bg-emerald-500/[0.05]",
  caution: "border-amber-500/25 bg-amber-500/[0.05]",
  warning: "border-rose-500/30 bg-rose-500/[0.06]",
  critical: "border-rose-500/50 bg-rose-500/[0.08]",
};

const LABEL_TONE: Record<TradeClassificationSeverity, string> = {
  info: "text-emerald-300",
  caution: "text-amber-300",
  warning: "text-rose-300",
  critical: "text-rose-200",
};

const SEVERITY_LABEL: Record<TradeClassificationSeverity, string> = {
  info: "Info",
  caution: "Caution",
  warning: "Warning",
  critical: "Critical",
};

const SECONDARY_TONE: Record<TradeClassificationSeverity, string> = {
  info: "text-emerald-300/85 bg-emerald-500/[0.06] ring-emerald-500/25",
  caution: "text-amber-300/90 bg-amber-500/[0.06] ring-amber-500/25",
  warning: "text-rose-300/90 bg-rose-500/[0.06] ring-rose-500/25",
  critical: "text-rose-200/90 bg-rose-500/[0.08] ring-rose-500/30",
};

export function TradeClassificationCard({
  classification,
}: {
  classification: TradeClassification;
}) {
  return (
    <section
      aria-label="Behavioral classification"
      className={cn(
        "flex flex-col gap-4 rounded-2xl border p-5 backdrop-blur",
        FRAME[classification.severity],
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Behavioral Verdict
        </span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] ring-1",
            SECONDARY_TONE[classification.severity],
            LABEL_TONE[classification.severity],
          )}
        >
          {SEVERITY_LABEL[classification.severity]}
        </span>
      </div>

      {/* Primary verdict — the single dominant pattern. Labeled
          explicitly so the hierarchy reads at a glance. */}
      <div className="flex flex-col gap-2">
        <span className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
          Primary
        </span>
        <h3
          className={cn(
            "text-lg font-semibold uppercase tracking-[0.12em]",
            LABEL_TONE[classification.severity],
          )}
        >
          {classification.label}
        </h3>
        <p className="max-w-3xl text-sm leading-relaxed text-foreground/85">
          {classification.description}
        </p>
      </div>

      {classification.secondary.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
          <span className="text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            Secondary flags
          </span>
          <div className="flex flex-wrap gap-1.5">
            {classification.secondary.map((id) => {
              const sev = severityForClassification(id);
              return (
                <span
                  key={id}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] ring-1",
                    SECONDARY_TONE[sev],
                  )}
                >
                  {labelForClassification(id)}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
