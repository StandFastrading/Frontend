import type { AppStore } from "@/store/types";

// Shared session-stamper. Used by every store append action that records
// session-scoped data (behavior events, interventions, monitoring events,
// active + closed trades). When an active session exists, the record gets
// its `sessionId` + `tradingDate`; otherwise the record is stored without
// session scope and treated as historical by current-session views.

type SessionStampable = {
  sessionId?: string;
  tradingDate?: string;
};

export function stampWithActiveSession<T extends SessionStampable>(
  state: Pick<AppStore, "activeSessionId" | "sessions">,
  record: T,
): T {
  if (record.sessionId) return record;
  const activeId = state.activeSessionId;
  if (!activeId) return record;
  const active = state.sessions.find((s) => s.sessionId === activeId);
  if (!active) return record;
  return {
    ...record,
    sessionId: active.sessionId,
    tradingDate: active.tradingDate,
  };
}
