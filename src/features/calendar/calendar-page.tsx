"use client";

import { useMemo, useState } from "react";

import { deriveTradeHistoryRows } from "@/features/trades/trade-history-engine";
import { useAppStore } from "@/store";

import { CalendarHeader } from "@/features/calendar/components/calendar-header";
import { MonthlySummary } from "@/features/calendar/components/monthly-summary";
import { CalendarGrid } from "@/features/calendar/components/calendar-grid";
import { DayDetailModal } from "@/features/calendar/components/day-detail-modal";
import {
  addMonths,
  formatMonthAnchor,
  isSameMonth,
  startOfMonth,
  type CalendarDayCell,
  type DailyCalendarSummary,
} from "@/features/calendar/calendar-engine";
import { useMonthlyCalendar } from "@/features/calendar/use-monthly-calendar";

// Calendar — composed shell.
//
// One piece of state at the shell level: which month is in view. The
// `useMonthlyCalendar` hook re-derives the grid + summaries whenever the
// anchor changes. A selected day pops the Day Detail modal; clicking a
// trade inside that modal hands off to the existing TradeDetailView.

export function CalendarPage() {
  const [monthAnchor, setMonthAnchor] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  // The `nowMs`-style tick on the calendar comes from the analytics-input
  // hook nested under `useMonthlyCalendar` — no extra timer needed here.

  // Selected day for the modal. We hold the date key (stable across
  // re-derivations) and look the summary up from the current snapshot.
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const summary = useMonthlyCalendar(monthAnchor);

  // Trade history rows for the trade list inside the Day Detail modal.
  // The engine already attached behavior tags, ruleBreakCount, and
  // pre-formatted labels we re-use in the modal.
  const traderId = useAppStore((s) => s.user.userId);
  const closedTrades = useAppStore((s) => s.closedTrades);
  const behaviorEvents = useAppStore((s) => s.behaviorEvents);
  const monitoringEvents = useAppStore((s) => s.monitoringEvents);
  const interventions = useAppStore((s) => s.interventions);
  const tradeReflections = useAppStore((s) => s.tradeReflections);
  const rows = useMemo(
    () =>
      deriveTradeHistoryRows({
        traderId,
        closedTrades,
        behaviorEvents,
        monitoringEvents,
        interventions,
        tradeReflections,
      }),
    [
      traderId,
      closedTrades,
      behaviorEvents,
      monitoringEvents,
      interventions,
      tradeReflections,
    ],
  );

  const selectedDay: DailyCalendarSummary | null = useMemo(() => {
    if (!selectedDateKey) return null;
    return summary.days.find((d) => d.date === selectedDateKey) ?? null;
  }, [selectedDateKey, summary.days]);

  const rowsForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    const ids = new Set(selectedDay.tradeIds);
    return rows
      .filter((r) => ids.has(r.id))
      .sort(
        (a, b) =>
          new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime(),
      );
  }, [selectedDay, rows]);

  // Anchor-based highlight for the "Today" button: only treat it as
  // active when the viewed month already contains today.
  const isTodayActive = useMemo(
    () => isSameMonth(monthAnchor, new Date()),
    [monthAnchor],
  );

  const handleSelectDay = (cell: CalendarDayCell) => {
    if (!cell.summary) return;
    setSelectedDateKey(cell.summary.date);
  };

  const handlePrev = () => setMonthAnchor((prev) => addMonths(prev, -1));
  const handleNext = () => setMonthAnchor((prev) => addMonths(prev, 1));
  const handleToday = () => setMonthAnchor(startOfMonth(new Date()));

  return (
    <div className="flex flex-col gap-4">
      <CalendarHeader
        monthLabel={formatMonthAnchor(monthAnchor)}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        isTodayActive={isTodayActive}
      />
      <MonthlySummary summary={summary} />
      <CalendarGrid summary={summary} onSelectDay={handleSelectDay} />
      {summary.totalTrades === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-card/30 p-4 text-xs text-muted-foreground backdrop-blur">
          No closed trades recorded for {summary.monthLabel}.
        </p>
      ) : null}

      <DayDetailModal
        day={selectedDay}
        rowsForDay={rowsForSelectedDay}
        open={selectedDay != null}
        onOpenChange={(next) => {
          if (!next) setSelectedDateKey(null);
        }}
      />
    </div>
  );
}
