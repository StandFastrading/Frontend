import { enqueueSync, monitoringEventMapper } from "@/lib/sync";
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
//
// Server sync: every append also inserts into `trade_monitoring_events`
// (append-only). Retries safe via (user_id, client_id).

export type MonitoringEventsSlice = {
  monitoringEvents: MonitoringEvent[];
  appendMonitoringEvent: (event: MonitoringEvent) => void;
  clearMonitoringEvents: () => void;
};

export const createMonitoringEventsSlice: SliceCreator<
  MonitoringEventsSlice
> = (set, get) => ({
  monitoringEvents: [],
  appendMonitoringEvent: (event) => {
    let stamped: MonitoringEvent | null = null;
    set((state) => {
      stamped = stampWithActiveSession(state, event);
      return {
        monitoringEvents: [stamped, ...state.monitoringEvents],
      };
    });
    const userId = get().userId;
    if (userId && stamped) {
      enqueueSync({
        table: "trade_monitoring_events",
        op: "insert",
        payload: monitoringEventMapper.toInsert(stamped, userId),
      });
    }
  },
  clearMonitoringEvents: () => set(() => ({ monitoringEvents: [] })),
});
