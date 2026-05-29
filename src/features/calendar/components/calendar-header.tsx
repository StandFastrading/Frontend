"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

// Top-of-page header. Title + subtitle + month nav (prev / month label /
// next / today). Matches the rest of the dashboard chrome.

export function CalendarHeader({
  monthLabel,
  onPrev,
  onNext,
  onToday,
  isTodayActive,
}: {
  monthLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isTodayActive: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <CalendarIcon className="size-3.5 text-brand" />
          Calendar
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Trading Calendar
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Monthly trading activity with daily, weekly, and monthly P/L.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-card/40 text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[10rem] text-center text-sm font-semibold tracking-tight text-foreground">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next month"
          className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-card/40 text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className={cn(
            "h-8 rounded-md px-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition-colors",
            isTodayActive
              ? "bg-foreground/10 text-foreground ring-1 ring-white/15"
              : "border border-white/10 bg-card/40 text-muted-foreground hover:border-white/20 hover:text-foreground",
          )}
        >
          Today
        </button>
      </div>
    </div>
  );
}
