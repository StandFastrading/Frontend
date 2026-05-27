import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";

import { ROUTES } from "@/config/routes";

// Secondary-tier card. Visual chrome (border-white/10 + bg-card/40) is one
// rank quieter than primary monitoring surfaces so reflection reads as a
// supportive, intentional practice — not a competing CTA.

export function ReflectionCard() {
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-white/10 bg-card/40 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Daily Reflection
        </span>
        <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/70">
          Open
        </span>
      </div>

      <div className="flex flex-1 flex-col items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-foreground/[0.04] text-foreground/70 ring-1 ring-white/10">
          <NotebookPen className="size-4" />
        </span>
        <div className="flex flex-col gap-1.5 leading-snug">
          <p className="text-sm font-semibold text-foreground">
            Close the loop on today.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A short, honest reflection compounds your behavioral edge over time.
          </p>
        </div>
      </div>

      <Link
        href={ROUTES.journal}
        className="group flex items-center justify-between gap-2 rounded-md border border-white/10 bg-background/40 px-3 py-2.5 text-xs font-semibold text-foreground/85 transition-colors hover:border-brand/30 hover:bg-brand/[0.06] hover:text-brand"
      >
        <span>Begin reflection</span>
        <ArrowRight className="size-3.5 text-muted-foreground transition-colors group-hover:text-brand" />
      </Link>

      <Link
        href={ROUTES.journal}
        className="flex items-center justify-center text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        View past reflections
      </Link>
    </div>
  );
}
