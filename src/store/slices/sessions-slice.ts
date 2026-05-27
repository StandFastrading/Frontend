import {
  buildSession,
  getCurrentTradingDate,
  getDefaultSessionMetrics,
  type SessionType,
  type TradingSession,
} from "@/types";
import { EMPTY_TRADE_INPUT } from "@/store/slices/trade-desk-slice";
import type { SliceCreator } from "@/store/types";

// Today's record filter. Used by the DEV reset action below. Drops records
// stamped with the current trading date; preserves anything from prior
// days. Records with no `tradingDate` (legacy / pre-session-boundary) are
// kept — they're already historical by definition.
function notFromToday<T extends { tradingDate?: string }>(today: string) {
  return (record: T) => record.tradingDate !== today;
}

// Sessions slice. Owns the daily trading-session boundary system.
//
// Two pieces of state live here:
//   - `sessions[]`     — historical + active. Append-only; closed sessions
//                        are preserved for Reports / Trade History.
//   - `activeSessionId` — pointer into `sessions`, or null when no session
//                        is open.
//
// The `session` slice (SessionMetrics) holds the LIVE counters
// (tradesTakenToday, redTradesToday, etc.). When a new session starts, we
// reset those counters here. Historical metrics are NOT deleted —
// `behaviorEvents`, `closedTrades`, `monitoringEvents`, `interventions`
// stay intact; current-session views filter by `sessionId` instead.

export type SessionsSlice = {
  sessions: TradingSession[];
  activeSessionId: string | null;

  // Helpers. Pure functions over slice state, exposed as methods so
  // non-React callers (other slice actions, persistence migrations) can
  // call them without a hook. React components should prefer the hooks
  // in `@/lib/sessions/session-helpers` so reads are memoized.
  startNewSession: (type?: SessionType, customLabel?: string | null) => void;
  closeCurrentSession: () => void;
  // Change the type label on the active session without resetting metrics
  // or creating a new session. Used by the dashboard header dropdown.
  setSessionType: (type: SessionType, customLabel?: string | null) => void;
  // Idempotent ensure-active-for-today: called once on hydration. If
  // there's no active session OR the active session belongs to a previous
  // calendar day, the stale session is closed and a fresh one starts.
  ensureSessionForToday: () => void;

  // [TEMPORARY · DEV-ONLY] Wipes today's session-scoped records so the
  // Behavioral State Aggregator can be tested from a clean baseline.
  // Drops all active trades + every record stamped with today's
  // tradingDate (behaviorEvents, monitoringEvents, interventions,
  // closedTrades), then rolls a fresh session boundary. Preserves user
  // profile, onboarding, risk rules, allowed setups, and prior days'
  // history. This action is NOT a long-term feature — remove before
  // shipping to production.
  resetTodaysSession: () => void;
};

export const createSessionsSlice: SliceCreator<SessionsSlice> = (
  set,
  get,
) => ({
  sessions: [],
  activeSessionId: null,

  startNewSession: (type = "regular", customLabel = null) => {
    set((state) => {
      // Close the existing active session if there is one.
      const closedSessions = state.sessions.map((s) =>
        s.sessionId === state.activeSessionId
          ? { ...s, status: "closed" as const, endedAt: new Date().toISOString() }
          : s,
      );
      const next = buildSession(type, customLabel);
      return {
        sessions: [...closedSessions, next],
        activeSessionId: next.sessionId,
        // Reset live counters — historical events stay where they are.
        session: getDefaultSessionMetrics(),
        // Clear Trade Desk in-flight state so the new session starts on a
        // clean slate (empty form, no stale validation, no approved
        // snapshot dangling from the previous session). Persisted active
        // trades from the previous session live in the archive — current-
        // session views already filter them out by sessionId.
        tradeInput: EMPTY_TRADE_INPUT,
        validation: null,
        hasCheckedTrade: false,
        approvedSnapshot: null,
        modalOpen: false,
        modalResults: [],
      };
    });
  },

  closeCurrentSession: () => {
    const activeId = get().activeSessionId;
    if (!activeId) return;
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.sessionId === activeId
          ? { ...s, status: "closed" as const, endedAt: new Date().toISOString() }
          : s,
      ),
      activeSessionId: null,
    }));
  },

  setSessionType: (type, customLabel = null) => {
    const activeId = get().activeSessionId;
    if (!activeId) return;
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.sessionId === activeId
          ? {
              ...s,
              sessionType: type,
              customLabel: type === "custom" ? (customLabel ?? s.customLabel ?? null) : null,
            }
          : s,
      ),
    }));
  },

  ensureSessionForToday: () => {
    const { activeSessionId, sessions } = get();
    const today = getCurrentTradingDate();
    const active = activeSessionId
      ? sessions.find((s) => s.sessionId === activeSessionId)
      : null;
    if (active && active.tradingDate === today && active.status === "active") {
      // Already have a live session for today.
      return;
    }
    // Either no active session or the active session is stale (yesterday).
    // Close + start fresh.
    get().startNewSession("regular");
  },

  // [TEMPORARY · DEV-ONLY]
  // Wipes today's session-scoped event log + open positions, then rolls a
  // fresh session boundary. Two-phase mutation:
  //   1. Filter today's tradingDate out of every event collection +
  //      empty the activeTrades list outright (open positions are by
  //      definition "today's" exposure).
  //   2. Call startNewSession() to reset session metrics + Trade Desk
  //      in-flight state + create the new session record.
  // Preserves: user, onboarding, riskRules, allowedSetups, sessions[]
  // (the historical session log itself), and any prior-day records that
  // carry a tradingDate other than today's.
  resetTodaysSession: () => {
    const today = getCurrentTradingDate();
    const isToday = notFromToday(today);
    set((state) => ({
      activeTrades: [],
      closedTrades: state.closedTrades.filter(isToday),
      behaviorEvents: state.behaviorEvents.filter(isToday),
      monitoringEvents: state.monitoringEvents.filter(isToday),
      interventions: state.interventions.filter(isToday),
    }));
    // Rolls the session boundary, resets SessionMetrics defaults, and
    // clears Trade Desk in-flight form/validation/snapshot state.
    get().startNewSession();
  },
});
