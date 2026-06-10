import { behaviorEventMapper, enqueueSync } from "@/lib/sync";
import { stampWithActiveSession } from "@/lib/sessions/session-stamp";
import type { BehaviorEvent } from "@/types";
import type { SliceCreator } from "@/store/types";

// Append-only behavior event log. Trade Desk produces; Dashboard,
// Behavior Feed, Journal, Reports, and Behavior Analytics consume.
//
// Every appended event is stamped with the active session at write time
// (when one exists). Records without `sessionId` are treated as historical
// by current-session views.
//
// Server sync: every append also inserts into `behavior_events`. The table
// is append-only (RLS denies UPDATE/DELETE), so retries are safe via the
// (user_id, client_id) unique constraint.

export type BehaviorEventsSlice = {
  behaviorEvents: BehaviorEvent[];
  appendBehaviorEvent: (event: BehaviorEvent) => void;
  replaceBehaviorEvents: (events: BehaviorEvent[]) => void;
  clearBehaviorEvents: () => void;
};

export const createBehaviorEventsSlice: SliceCreator<BehaviorEventsSlice> = (
  set,
  get,
) => ({
  behaviorEvents: [],
  appendBehaviorEvent: (event) => {
    let stamped: BehaviorEvent | null = null;
    set((state) => {
      stamped = stampWithActiveSession(state, event);
      return {
        behaviorEvents: [stamped, ...state.behaviorEvents],
      };
    });
    const userId = get().userId;
    if (userId && stamped) {
      enqueueSync({
        table: "behavior_events",
        op: "insert",
        payload: behaviorEventMapper.toInsert(stamped, userId),
      });
    }
  },
  replaceBehaviorEvents: (events) => set(() => ({ behaviorEvents: events })),
  clearBehaviorEvents: () => set(() => ({ behaviorEvents: [] })),
});
