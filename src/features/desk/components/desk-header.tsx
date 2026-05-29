import { Lock, Terminal } from "lucide-react";

import { StartNewSessionButton } from "@/features/desk/components/start-new-session-button";

export function DeskHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Trade Desk
        </h1>
        <p className="text-sm text-muted-foreground">
          Plan the trade. Check the risk. Control the behavior.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-brand/40 bg-brand/[0.08] px-3 py-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-brand ring-1 ring-brand/30">
            <Terminal className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Mode
            </span>
            <span className="text-sm font-semibold text-brand">
              Manual Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-card/40 px-3 py-2 opacity-70">
          <span className="flex size-7 items-center justify-center rounded-md bg-foreground/10 text-muted-foreground ring-1 ring-white/10">
            <Lock className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Broker Sync
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              Coming Later
            </span>
          </div>
        </div>

        {/* DEV / PROTOTYPE — session lifecycle control. Final auth flow
            will replace this with broker-driven session rotation. */}
        <StartNewSessionButton variant="primary" />
      </div>
    </div>
  );
}
