import { stampWithActiveSession } from "@/lib/sessions/session-stamp";
import type { BehaviorEvent } from "@/types";
import type { SliceCreator } from "@/store/types";

// Append-only behavior event log. Trade Desk produces; Dashboard,
// Behavior Feed, Journal, Reports, and Behavior Analytics consume.
//
// Every appended event is stamped with the active session at write time
// (when one exists). Records without `sessionId` are treated as historical
// by current-session views.

export type BehaviorEventsSlice = {
  behaviorEvents: BehaviorEvent[];
  appendBehaviorEvent: (event: BehaviorEvent) => void;
  replaceBehaviorEvents: (events: BehaviorEvent[]) => void;
  clearBehaviorEvents: () => void;
};

export const createBehaviorEventsSlice: SliceCreator<BehaviorEventsSlice> = (
  set,
) => ({
  behaviorEvents: [],
  appendBehaviorEvent: (event) =>
    set((state) => ({
      behaviorEvents: [
        stampWithActiveSession(state, event),
        ...state.behaviorEvents,
      ],
    })),
  replaceBehaviorEvents: (events) => set(() => ({ behaviorEvents: events })),
  clearBehaviorEvents: () => set(() => ({ behaviorEvents: [] })),
});
