import { z } from "zod";

// A `TradingSession` is the IDENTITY of a single trading day's activity
// window — the boundary that current-session metrics filter against.
// Lifecycle is intentionally minimal: started → closed. Multiple sessions
// can exist across days; only one is `active` at any time.
//
// What lives on the session itself: identity, date, type, status.
// What does NOT live here: counters (`tradesTakenToday`, etc.). Those stay
// on the `session` (SessionMetrics) slice — the session here is *which*
// session those counters belong to, not the counters themselves. Starting
// a new session resets the counters; closing one preserves them as a final
// snapshot until the next start.

export const SESSION_TYPES = [
  "premarket",
  "regular",
  "afterhours",
  "custom",
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const SESSION_STATUSES = ["active", "closed"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const tradingSessionSchema = z.object({
  sessionId: z.string(),
  // YYYY-MM-DD in local time. Stored as a string rather than a Date so the
  // serialized snapshot in localStorage round-trips cleanly.
  tradingDate: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  sessionType: z.enum(SESSION_TYPES),
  // Free-text label rendered in place of the canned type name when
  // `sessionType === "custom"`. Null for the named types.
  customLabel: z.string().nullable().optional(),
  status: z.enum(SESSION_STATUSES),
});
export type TradingSession = z.infer<typeof tradingSessionSchema>;

// Local YYYY-MM-DD for the user's clock. Two sessions started on the same
// calendar day share a tradingDate even if startedAt differs by hours.
export function getCurrentTradingDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function buildSession(
  type: SessionType = "regular",
  customLabel: string | null = null,
): TradingSession {
  return {
    sessionId: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    tradingDate: getCurrentTradingDate(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    sessionType: type,
    customLabel,
    status: "active",
  };
}

// Human-readable label for a session — `customLabel` overrides the canned
// label when present. Used in the dashboard header pill and anywhere else
// the session needs to be named in copy.
export function sessionDisplayLabel(session: TradingSession): string {
  if (session.sessionType === "custom" && session.customLabel) {
    return session.customLabel;
  }
  switch (session.sessionType) {
    case "premarket":
      return "Premarket";
    case "regular":
      return "Regular Hours";
    case "afterhours":
      return "After Hours";
    case "custom":
      return "Custom Session";
  }
}
