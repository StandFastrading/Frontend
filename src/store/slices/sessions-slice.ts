import {
  enqueueSync,
  tradingSessionMapper,
} from "@/lib/sync";
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

function syncSessionUpsert(session: TradingSession, userId: string | null) {
  if (!userId) return;
  enqueueSync({
    table: "trading_sessions",
    op: "upsert",
    payload: tradingSessionMapper.toUpsert(session, userId),
    onConflict: "user_id,client_id",
  });
}

function syncSessionUpdate(
  sessionId: string,
  patch: Partial<TradingSession>,
  userId: string | null,
) {
  if (!userId) return;
  enqueueSync({
    table: "trading_sessions",
    op: "update",
    payload: tradingSessionMapper.toUpdate(patch),
    match: { user_id: userId, client_id: sessionId },
  });
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
//
// Server sync: every session create / status change upserts/updates the
// `trading_sessions` row. UNIQUE on (user_id, client_id) makes retries safe.

export type SessionsSlice = {
  sessions: TradingSession[];
  activeSessionId: string | null;

  startNewSession: (
    type?: SessionType,
    customLabel?: string | null,
    opts?: { preserveDeskState?: boolean },
  ) => void;
  closeCurrentSession: () => void;
  setSessionType: (type: SessionType, customLabel?: string | null) => void;
  ensureSessionForToday: (opts?: { preserveDeskState?: boolean }) => void;
  resetTodaysSession: () => void;
};

export const createSessionsSlice: SliceCreator<SessionsSlice> = (
  set,
  get,
) => ({
  sessions: [],
  activeSessionId: null,

  startNewSession: (type = "regular", customLabel = null, opts = {}) => {
    const prevActiveId = get().activeSessionId;
    const userId = get().userId;
    const closedAt = new Date().toISOString();
    let newSession: TradingSession | null = null;
    set((state) => {
      // Close the existing active session if there is one.
      const closedSessions = state.sessions.map((s) =>
        s.sessionId === state.activeSessionId
          ? { ...s, status: "closed" as const, endedAt: closedAt }
          : s,
      );
      const next = buildSession(type, customLabel);
      newSession = next;
      // Trade Desk in-flight state. Cleared by default (user-triggered
      // "Start New Session" wants a clean slate). Skipped when the
      // caller passes `preserveDeskState: true` — that's the automatic
      // midnight rollover path; wiping the trader's typed plan before
      // validation runs would be bad UX.
      const deskClear = opts.preserveDeskState
        ? {}
        : {
            tradeInput: EMPTY_TRADE_INPUT,
            validation: null,
            hasCheckedTrade: false,
            approvedSnapshot: null,
            modalOpen: false,
            modalResults: [],
          };
      return {
        sessions: [...closedSessions, next],
        activeSessionId: next.sessionId,
        // Reset live counters — historical events stay where they are.
        // Persisted active trades from the previous session live in the
        // archive — current-session views already filter them out by
        // sessionId.
        session: getDefaultSessionMetrics(),
        ...deskClear,
      };
    });
    // After the local mutation, sync the prior-close + new-insert separately.
    if (prevActiveId) {
      syncSessionUpdate(
        prevActiveId,
        { status: "closed", endedAt: closedAt },
        userId,
      );
    }
    if (newSession) {
      syncSessionUpsert(newSession, userId);
    }
  },

  closeCurrentSession: () => {
    const activeId = get().activeSessionId;
    if (!activeId) return;
    const closedAt = new Date().toISOString();
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.sessionId === activeId
          ? { ...s, status: "closed" as const, endedAt: closedAt }
          : s,
      ),
      activeSessionId: null,
    }));
    syncSessionUpdate(
      activeId,
      { status: "closed", endedAt: closedAt },
      get().userId,
    );
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
    syncSessionUpdate(
      activeId,
      {
        sessionType: type,
        customLabel: type === "custom" ? customLabel : null,
      },
      get().userId,
    );
  },

  ensureSessionForToday: (opts = {}) => {
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
    // Close + start fresh, threading the desk-preservation flag through
    // to startNewSession so mid-action callers don't lose their input.
    get().startNewSession("regular", null, {
      preserveDeskState: opts.preserveDeskState ?? false,
    });
  },

  // [TEMPORARY · DEV-ONLY]
  // Wipes today's session-scoped event log + open positions locally. Does
  // NOT cascade to the server — use a future delete-account RPC for that.
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
    get().startNewSession();
  },
});
