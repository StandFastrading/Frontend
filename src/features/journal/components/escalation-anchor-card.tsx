import { TrendingDown, Zap } from "lucide-react";

import {
  categoryLabel,
  categoryTone,
} from "@/lib/journal/trade-event-categories";
import { cn } from "@/lib/utils";
import type { EscalationAnchor } from "@/features/journal/components/trade-behavior-timeline";

// SECTION — Escalation Anchor
//
// Surfaces the single moment in the trade where behavioral integrity
// shifted. The timeline below shows EVERY event; this card answers
// "which one was the inflection point?". Renders the timestamp + the
// event line + a one-line narrative explaining what shifted. Clean
// trades have no anchor — the card simply doesn't render.

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EscalationAnchorCard({
  anchor,
}: {
  anchor: EscalationAnchor;
}) {
  const { entry, narrative } = anchor;
  const isCritical = entry.severity === "critical";
  return (
    <section
      aria-label="Escalation anchor"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-5 backdrop-blur",
        isCritical
          ? "border-rose-500/40 bg-rose-500/[0.07]"
          : "border-rose-500/25 bg-rose-500/[0.04]",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Zap className="size-3.5 text-rose-300/90" />
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-rose-300/90">
          Escalation Anchor
        </span>
        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/70">
          Where discipline shifted
        </span>
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-foreground/90">
        {narrative}
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-background/30 px-4 py-3">
        <TrendingDown className="size-4 shrink-0 text-rose-300/85" />
        <div className="flex flex-1 flex-col leading-tight">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {entry.title}
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.14em] ring-1",
                categoryTone(entry.category),
              )}
            >
              {categoryLabel(entry.category)}
            </span>
          </div>
          <span className="text-[0.7rem] text-muted-foreground">
            {entry.description}
          </span>
        </div>
        <span className="text-[0.65rem] tabular-nums uppercase tracking-[0.12em] text-muted-foreground">
          {formatTime(entry.timestamp)}
        </span>
      </div>
    </section>
  );
}
