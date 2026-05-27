import { Brain } from "lucide-react";

// Single deterministic observation about the session's behavior. The
// engine produces ONE insight per session — calm, clinical, no
// motivational copy. Surfaced under the reflection questions so the
// trader writes against the engine's read rather than the empty form.

export function BehavioralInsightCard({ insight }: { insight: string }) {
  return (
    <section
      aria-label="Behavioral insight"
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/40 p-5 backdrop-blur"
    >
      <div className="flex items-center gap-2">
        <Brain className="size-4 text-brand" />
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Behavioral Observation
        </span>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-foreground/85">
        {insight}
      </p>
    </section>
  );
}
