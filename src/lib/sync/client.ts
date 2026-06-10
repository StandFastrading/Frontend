// Typed wrappers around the Supabase client for sync operations.
// Used by the queue + by direct one-shot writes that don't need queuing
// (e.g. on-mount upserts during onboarding).

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TableName =
  | "profiles"
  | "risk_rules"
  | "trading_sessions"
  | "trades"
  | "trade_monitoring_events"
  | "behavior_events"
  | "interventions"
  | "session_notes"
  | "daily_reflections"
  | "trade_reflections";

export interface UpsertOptions {
  onConflict?: string;
}

export async function supabaseInsert<T extends object>(
  table: TableName,
  row: T,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from(table).insert(row);
  if (error) throw error;
}

export async function supabaseUpsert<T extends object>(
  table: TableName,
  row: T,
  options: UpsertOptions = {},
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from(table)
    .upsert(row, { onConflict: options.onConflict });
  if (error) throw error;
}

export async function supabaseUpdate<T extends object>(
  table: TableName,
  patch: T,
  match: Record<string, string | number | boolean | null>,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  let query = supabase.from(table).update(patch);
  for (const [col, val] of Object.entries(match)) {
    query = query.eq(col, val);
  }
  const { error } = await query;
  if (error) throw error;
}

export async function supabaseDelete(
  table: TableName,
  match: Record<string, string | number>,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  let query = supabase.from(table).delete();
  for (const [col, val] of Object.entries(match)) {
    query = query.eq(col, val);
  }
  const { error } = await query;
  if (error) throw error;
}
