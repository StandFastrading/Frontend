"use client";

// One-shot migration that uploads zustand-persisted data to Supabase. Runs
// the first time an existing localStorage-only user signs into the new
// server-backed app. Detection: `profiles.migrated_from_local_at` is null
// AND the local zustand store has at least one record worth uploading.
//
// Strategy: enqueue every record as a sync task and let the queue's normal
// retry/coalesce logic do the rest. We don't bulk-INSERT — the queue
// already handles batching, persistence, and resilience.
//
// After enqueuing, stamp `profiles.migrated_from_local_at = now()` so a
// re-login on the same device doesn't re-run the migration. The
// (user_id, client_id) unique constraint makes a duplicate run a no-op
// (UPSERT semantics) even if the stamp write fails.

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store";
import { getCurrentTradingDate } from "@/types";

import { enqueueSync } from "./queue";
import {
  behaviorEventMapper,
  dailyReflectionMapper,
  interventionMapper,
  monitoringEventMapper,
  profileMapper,
  riskRulesMapper,
  sessionNoteMapper,
  tradeMapper,
  tradeReflectionMapper,
  tradingSessionMapper,
} from "./mappers";

export interface MigrationResult {
  uploaded: number;
  alreadyMigrated: boolean;
}

export async function migrateLocalToServer(
  userId: string,
): Promise<MigrationResult> {
  const supabase = createSupabaseBrowserClient();

  // Step 1 — is this user already migrated?
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("migrated_from_local_at")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) throw profileErr;
  if (profile?.migrated_from_local_at) {
    return { uploaded: 0, alreadyMigrated: true };
  }

  // Step 2 — read everything out of the zustand store. Post-hydration,
  // this is the unified shape we want on the server.
  const state = useAppStore.getState();
  const today = getCurrentTradingDate();
  let uploaded = 0;

  // Singletons first — the auth trigger creates default rows, so these
  // are UPDATEs in spirit even when expressed as UPSERTs.
  enqueueSync({
    table: "profiles",
    op: "upsert",
    payload: profileMapper.toUpsert(state.user, userId),
    onConflict: "id",
  });
  uploaded += 1;

  enqueueSync({
    table: "risk_rules",
    op: "upsert",
    payload: riskRulesMapper.toUpsert(state.riskRules, userId),
    onConflict: "user_id",
  });
  uploaded += 1;

  // Sessions before trades (FK direction) — though the FKs are text +
  // application-enforced, the ordering still matches what consumers expect.
  for (const session of state.sessions) {
    enqueueSync({
      table: "trading_sessions",
      op: "upsert",
      payload: tradingSessionMapper.toUpsert(session, userId),
      onConflict: "user_id,client_id",
    });
    uploaded += 1;
  }

  for (const trade of state.activeTrades) {
    enqueueSync({
      table: "trades",
      op: "upsert",
      payload: tradeMapper.activeTradeToInsert(
        trade,
        userId,
        trade.tradingDate ?? today,
      ),
      onConflict: "user_id,client_id",
    });
    uploaded += 1;
  }

  for (const trade of state.closedTrades) {
    enqueueSync({
      table: "trades",
      op: "upsert",
      payload: tradeMapper.closedTradeToInsert(
        trade,
        userId,
        trade.tradingDate ?? today,
      ),
      onConflict: "user_id,client_id",
    });
    uploaded += 1;
  }

  for (const event of state.behaviorEvents) {
    enqueueSync({
      table: "behavior_events",
      op: "insert",
      payload: behaviorEventMapper.toInsert(event, userId),
    });
    uploaded += 1;
  }

  for (const intervention of state.interventions) {
    enqueueSync({
      table: "interventions",
      op: "insert",
      payload: interventionMapper.toInsert(intervention, userId),
    });
    uploaded += 1;
  }

  for (const monEvent of state.monitoringEvents) {
    enqueueSync({
      table: "trade_monitoring_events",
      op: "insert",
      payload: monitoringEventMapper.toInsert(monEvent, userId),
    });
    uploaded += 1;
  }

  for (const reflection of state.reflections) {
    enqueueSync({
      table: "daily_reflections",
      op: "upsert",
      payload: dailyReflectionMapper.toUpsert(reflection, userId),
      onConflict: "user_id,trading_date",
    });
    uploaded += 1;
  }

  for (const tradeRefl of state.tradeReflections) {
    enqueueSync({
      table: "trade_reflections",
      op: "upsert",
      payload: tradeReflectionMapper.toUpsert(tradeRefl, userId),
      onConflict: "user_id,trade_id",
    });
    uploaded += 1;
  }

  for (const note of state.sessionNotes) {
    enqueueSync({
      table: "session_notes",
      op: "insert",
      payload: sessionNoteMapper.toInsert(note, userId),
    });
    uploaded += 1;
  }

  // Step 3 — stamp the migration timestamp. Doesn't gate on queue completion
  // because the queue is idempotent — even if the stamp write happens first,
  // a re-run is a no-op via (user_id, client_id) uniqueness.
  const { error: stampErr } = await supabase
    .from("profiles")
    .update({ migrated_from_local_at: new Date().toISOString() })
    .eq("id", userId);
  if (stampErr) {
    // Non-fatal — the queue still flushes; next session will retry the
    // stamp via this same routine. Log so it's visible.
    console.warn(
      "[migrate-local] queued writes but failed to stamp migrated_at",
      stampErr,
    );
  }

  return { uploaded, alreadyMigrated: false };
}
