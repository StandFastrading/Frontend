import { BookOpen, HelpCircle, ShieldCheck, Users } from "lucide-react";

export function MonitoringStrip() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/15 bg-card/40 px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-foreground/85">
        <ShieldCheck className="size-4 text-brand" />
        <span>StandFast is monitoring your behavior in real-time</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <button
          type="button"
          className="flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <HelpCircle className="size-3.5" />
          Need help?
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <BookOpen className="size-3.5" />
          Read the docs
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <Users className="size-3.5" />
          Join the community
        </button>
      </div>
    </div>
  );
}
