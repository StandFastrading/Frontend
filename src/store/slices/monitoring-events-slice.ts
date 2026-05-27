import { stampWithActiveSession } from "@/lib/sessions/session-stamp";
import type { MonitoringEvent } from "@/types";
import type { SliceCreator } from "@/store/types";

// Append-only stream of MonitoringEvents produced by the Behavior Deviation
// Engine. Active Trade Monitoring filters by `tradeId`; Reports + Behavior
// Analytics aggregate across all trades.
//
// Consumers that need a per-trade slice should select `monitoringEvents`
// directly and `useMemo` the filter — never call a method inside a Zustand
// selector (that returns a fresh array every render and triggers React 18's
// getSnapshot infinite-loop guard).

export type MonitoringEventsSlice = {
  monitoringEvents: MonitoringEvent[];
  appendMonitoringEvent: (event: MonitoringEvent) => void;
  clearMonitoringEvents: () => void;
};

export const createMonitoringEventsSlice: SliceCreator<
  MonitoringEventsSlice
> = (set) => ({
  monitoringEvents: [],
  appendMonitoringEvent: (event) =>
    set((state) => ({
      monitoringEvents: [
        stampWithActiveSession(state, event),
        ...state.monitoringEvents,
      ],
    })),
  clearMonitoringEvents: () => set(() => ({ monitoringEvents: [] })),
});
