// Server-side seed fetcher. Called from the dashboard server component
// before any client code runs. Returns row payloads in Supabase shape;
// the StoreHydrator on the client converts them to slice shape via the
// mappers and hands them to the zustand store.

import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BehaviorEventRow,
  DailyReflectionRow,
  InterventionRow,
  ProfileRow,
  RiskRulesRow,
  SessionNoteRow,
  TradeMonitoringEventRow,
  TradeReflectionRow,
  TradeRow,
  TradingSessionRow,
} from "@/types/supabase";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1_000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;

export interface ServerSeedPayload {
  profile: ProfileRow | null;
  riskRules: RiskRulesRow | null;
  activeSession: TradingSessionRow | null;
  sessions: TradingSessionRow[];
  activeTrades: TradeRow[];
  closedTrades: TradeRow[];
  behaviorEvents: BehaviorEventRow[];
  interventions: InterventionRow[];
  monitoringEvents: TradeMonitoringEventRow[];
  reflections: DailyReflectionRow[];
  tradeReflections: TradeReflectionRow[];
  sessionNotes: SessionNoteRow[];
}

/** Empty payload used when the user has no data yet (post-signup) or when
 *  Supabase is unreachable. The hydrator will treat this as a no-op. */
export const emptySeedPayload: ServerSeedPayload = {
  profile: null,
  riskRules: null,
  activeSession: null,
  sessions: [],
  activeTrades: [],
  closedTrades: [],
  behaviorEvents: [],
  interventions: [],
  monitoringEvents: [],
  reflections: [],
  tradeReflections: [],
  sessionNotes: [],
};

function isoNDaysAgo(ms: number) {
  return new Date(Date.now() - ms).toISOString();
}
function dateNDaysAgo(ms: number) {
  return new Date(Date.now() - ms).toISOString().slice(0, 10);
}

export async function fetchServerSeed(
  userId: string,
): Promise<ServerSeedPayload> {
  const supabase = await createSupabaseServerClient();

  const sevenDaysAgoIso = isoNDaysAgo(SEVEN_DAYS_MS);
  const thirtyDaysAgoIso = isoNDaysAgo(THIRTY_DAYS_MS);
  const thirtyDaysAgoDate = dateNDaysAgo(THIRTY_DAYS_MS);

  const [
    profileR,
    rulesR,
    sessionsR,
    activeTradesR,
    closedTradesR,
    behaviorEventsR,
    interventionsR,
    monitoringEventsR,
    reflectionsR,
    tradeReflectionsR,
    sessionNotesR,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("risk_rules")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("trading_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("trading_date", thirtyDaysAgoDate)
      .order("started_at", { ascending: false }),
    supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("activated_at", { ascending: false }),
    supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "closed")
      .gte("closed_at", thirtyDaysAgoIso)
      .order("closed_at", { ascending: false }),
    supabase
      .from("behavior_events")
      .select("*")
      .eq("user_id", userId)
      .gte("timestamp", sevenDaysAgoIso)
      .order("timestamp", { ascending: false }),
    supabase
      .from("interventions")
      .select("*")
      .eq("user_id", userId)
      .gte("timestamp", sevenDaysAgoIso)
      .order("timestamp", { ascending: false }),
    supabase
      .from("trade_monitoring_events")
      .select("*")
      .eq("user_id", userId)
      .gte("timestamp", sevenDaysAgoIso)
      .order("timestamp", { ascending: false }),
    supabase
      .from("daily_reflections")
      .select("*")
      .eq("user_id", userId)
      .gte("trading_date", thirtyDaysAgoDate)
      .order("trading_date", { ascending: false }),
    supabase
      .from("trade_reflections")
      .select("*")
      .eq("user_id", userId)
      .gte("saved_at", thirtyDaysAgoIso)
      .order("saved_at", { ascending: false }),
    supabase
      .from("session_notes")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgoIso)
      .order("created_at", { ascending: false }),
  ]);

  const sessions = (sessionsR.data ?? []) as TradingSessionRow[];
  const activeSession = sessions.find((s) => s.status === "active") ?? null;

  return {
    profile: (profileR.data as ProfileRow | null) ?? null,
    riskRules: (rulesR.data as RiskRulesRow | null) ?? null,
    activeSession,
    sessions,
    activeTrades: (activeTradesR.data ?? []) as TradeRow[],
    closedTrades: (closedTradesR.data ?? []) as TradeRow[],
    behaviorEvents: (behaviorEventsR.data ?? []) as BehaviorEventRow[],
    interventions: (interventionsR.data ?? []) as InterventionRow[],
    monitoringEvents: (monitoringEventsR.data ?? []) as TradeMonitoringEventRow[],
    reflections: (reflectionsR.data ?? []) as DailyReflectionRow[],
    tradeReflections: (tradeReflectionsR.data ?? []) as TradeReflectionRow[],
    sessionNotes: (sessionNotesR.data ?? []) as SessionNoteRow[],
  };
}
