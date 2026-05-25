import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ROUTES } from "@/config/routes";

export function ReflectionCard() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Reflection
      </span>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-semibold text-foreground">
          End of day reflection not completed.
        </p>
        <p className="text-xs text-muted-foreground">
          Take 2 minutes to reflect on your performance and reinforce your
          process.
        </p>
      </div>

      <Link
        href={ROUTES.journal}
        className="block rounded-md bg-brand py-2.5 text-center text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
      >
        Start Reflection
      </Link>

      <Link
        href={ROUTES.journal}
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:text-brand/80"
      >
        View Journal
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
