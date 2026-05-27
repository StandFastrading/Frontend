import { Compass } from "lucide-react";

// Single focus objective for the next session. One sentence,
// behavioral, actionable. Visually highlighted via a brand-toned
// border + soft halo — but tone stays restrained (no fireworks, no
// motivational vocabulary).

export function TomorrowFocusCard({ focus }: { focus: string }) {
  return (
    <section
      aria-label="Tomorrow focus"
      className="relative overflow-hidden rounded-2xl border border-brand/30 bg-brand/[0.04] p-5 backdrop-blur"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/[0.06] via-brand/[0.02] to-transparent opacity-90"
      />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Compass className="size-4 text-brand" />
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-brand">
            Tomorrow Focus
          </span>
        </div>
        <p className="max-w-3xl text-base font-medium leading-relaxed text-foreground">
          {focus}
        </p>
      </div>
    </section>
  );
}
