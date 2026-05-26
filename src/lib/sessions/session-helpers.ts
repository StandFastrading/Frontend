import { useMemo } from "react";

import type {
  ActiveTrade,
  BehaviorEvent,
  ClosedTrade,
  InterventionEvent,
  MonitoringEvent,
  TradingSession,
} from "@/types";
import { useAppStore } from "@/store";
import type { AppStore } from "@/store/types";

// =============================================================================
// Trading-session helpers
// =============================================================================
//
// Pure-function lens over the persisted store + React hooks that wrap each
// lens with primitive selectors + `useMemo`. Use the hooks from React
// components (no getSnapshot loop risk); use the pure functions from other
// store actions, jobs, or future export pipelines.
//
// Spec-named helpers:
//   - getActiveSession(state)
//   - startNewSession()       — slice action on `AppStore`
//   - closeCurrentSession()   — slice action on `AppStore`
//   - getCurrentSessionEvents(state)
//   - getCurrentSessionTrades(state)
//
// Everything filters by `sessionId === activeSessionId`. Records without
// a `sessionId` (legacy / historical) are excluded from current-session
// views; they remain in the store untouched so Reports / Trade History can
// see them later.

type SessionState = Pick<AppStore, "sessions" | "activeSessionId">;

// -----------------------------------------------------------------------------
// Pure functions
// -----------------------------------------------------------------------------

export function getActiveSession(state: SessionState): TradingSession | null {
  if (!state.activeSessionId) return null;
  return (
    state.sessions.find((s) => s.sessionId === state.activeSessionId) ?? null
  );
}

export function getCurrentSessionEvents(
  state: SessionState & { behaviorEvents: BehaviorEvent[] },
): BehaviorEvent[] {
  const activeId = state.activeSessionId;
  if (!activeId) return [];
  return state.behaviorEvents.filter((e) => e.sessionId === activeId);
}

export function getCurrentSessionTrades(
  state: SessionState & {
    activeTrades: ActiveTrade[];
    closedTrades: ClosedTrade[];
  },
): { activeTrades: ActiveTrade[]; closedTrades: ClosedTrade[] } {
  const activeId = state.activeSessionId;
  if (!activeId) return { activeTrades: [], closedTrades: [] };
  return {
    activeTrades: state.activeTrades.filter((t) => t.sessionId === activeId),
    closedTrades: state.closedTrades.filter((t) => t.sessionId === activeId),
  };
}

export function getCurrentSessionMonitoringEvents(
  state: SessionState & { monitoringEvents: MonitoringEvent[] },
): MonitoringEvent[] {
  const activeId = state.activeSessionId;
  if (!activeId) return [];
  return state.monitoringEvents.filter((e) => e.sessionId === activeId);
}

export function getCurrentSessionInterventions(
  state: SessionState & { interventions: InterventionEvent[] },
): InterventionEvent[] {
  const activeId = state.activeSessionId;
  if (!activeId) return [];
  return state.interventions.filter((e) => e.sessionId === activeId);
}

// -----------------------------------------------------------------------------
// React hooks — memoized + primitive-selector based (loop-safe).
// -----------------------------------------------------------------------------

export function useActiveSession(): TradingSession | null {
  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  return useMemo(
    () => getActiveSession({ sessions, activeSessionId }),
    [sessions, activeSessionId],
  );
}

export function useCurrentSessionEvents(): BehaviorEvent[] {
  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const behaviorEvents = useAppStore((s) => s.behaviorEvents);
  return useMemo(
    () =>
      getCurrentSessionEvents({ sessions, activeSessionId, behaviorEvents }),
    [sessions, activeSessionId, behaviorEvents],
  );
}

export function useCurrentSessionTrades(): {
  activeTrades: ActiveTrade[];
  closedTrades: ClosedTrade[];
} {
  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const activeTrades = useAppStore((s) => s.activeTrades);
  const closedTrades = useAppStore((s) => s.closedTrades);
  return useMemo(
    () =>
      getCurrentSessionTrades({
        sessions,
        activeSessionId,
        activeTrades,
        closedTrades,
      }),
    [sessions, activeSessionId, activeTrades, closedTrades],
  );
}

export function useCurrentSessionMonitoringEvents(): MonitoringEvent[] {
  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const monitoringEvents = useAppStore((s) => s.monitoringEvents);
  return useMemo(
    () =>
      getCurrentSessionMonitoringEvents({
        sessions,
        activeSessionId,
        monitoringEvents,
      }),
    [sessions, activeSessionId, monitoringEvents],
  );
}

export function useCurrentSessionInterventions(): InterventionEvent[] {
  const sessions = useAppStore((s) => s.sessions);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const interventions = useAppStore((s) => s.interventions);
  return useMemo(
    () =>
      getCurrentSessionInterventions({
        sessions,
        activeSessionId,
        interventions,
      }),
    [sessions, activeSessionId, interventions],
  );
}
