import { z } from "zod";

// =============================================================================
// Reflection + Session Notes
// =============================================================================
//
// Persisted records produced by the Journal section. Reflection is a
// daily, structured artifact — six guided questions + optional free-text
// + a FROZEN snapshot of the behavioral summary at save-time. Notes are
// freeform, untimed, optionally categorized.
//
// Snapshots are persisted (not re-derived from the live event log)
// because reflections are historical journal entries — they should
// preserve what the engine said the day-of, even after later session
// resets or natural decay.
// =============================================================================

// -----------------------------------------------------------------------------
// Behavior summary snapshot — frozen at save-time. String enums are kept
// loose (z.string()) so the schema doesn't drift if the aggregator's
// state vocabulary evolves; UI consumers handle unknown values gracefully.
// -----------------------------------------------------------------------------
export const reflectionSummarySnapshotSchema = z.object({
  state: z.string(),
  stateLabel: z.string(),
  disciplineScore: z.number(),
  disciplineBand: z.string(),
  disciplineBandLabel: z.string(),
  warningOverrides: z.number(),
  stopWidenEvents: z.number(),
  positionSizeIncreases: z.number(),
  rapidReentries: z.number(),
  overtradingDetected: z.boolean(),
  escalationDetected: z.boolean(),
  lockoutActive: z.boolean(),
  totalInterventions: z.number(),
  cleanExecutions: z.number(),
  tradesTakenToday: z.number(),
  // The cluster with the most session impact (highest dominant severity
  // among active clusters). Null when no cluster activity.
  biggestCluster: z.string().nullable(),
  biggestClusterLabel: z.string().nullable(),
  // P/L is secondary on the reflection card per the product principle —
  // surfaced but never lead. Null when no closed trades.
  pnLToday: z.number().nullable(),
});
export type ReflectionSummarySnapshot = z.infer<
  typeof reflectionSummarySnapshotSchema
>;

// -----------------------------------------------------------------------------
// Reflection question vocabulary. The prompts live alongside this enum so
// future renumbering ripples through one file. Saved reflections store
// answers keyed by these ids — never by prompt text.
// -----------------------------------------------------------------------------
export const REFLECTION_QUESTION_IDS = [
  "discipline_shift",
  "emotional_decision",
  "minimized_warning",
  "dangerous_if_repeated",
  "repeat_tomorrow",
  "identity_alignment",
] as const;
export type ReflectionQuestionId = (typeof REFLECTION_QUESTION_IDS)[number];

// -----------------------------------------------------------------------------
// Daily reflection record.
// -----------------------------------------------------------------------------
export const dailyReflectionSchema = z.object({
  id: z.string(),
  // YYYY-MM-DD trading date the reflection belongs to. Used as the dedup
  // key — one reflection per trading day; the slice action replaces on
  // duplicate.
  tradingDate: z.string(),
  // Session id of the active session at save-time. Null when no session
  // was active (rare — reflection after manually closing the session).
  sessionId: z.string().nullable(),
  // ISO of save time.
  savedAt: z.string(),
  // Answers keyed by question id. Keys are loosely typed because the
  // store may persist unanswered questions as empty strings or omit them.
  // Consumers should treat missing keys as "unanswered".
  answers: z.record(z.string(), z.string()),
  // Optional emotional notes — how the trader felt during the session.
  emotionalNotes: z.string(),
  // Optional freeform notes — anything that doesn't fit the questions.
  freeformNotes: z.string(),
  // Frozen behavioral summary at the moment of save.
  summary: reflectionSummarySnapshotSchema,
  // Frozen insight + focus copy at the moment of save. The engine
  // re-derives these from live state each session; the persisted strings
  // preserve what the trader saw the day-of.
  insight: z.string(),
  tomorrowFocus: z.string(),
});
export type DailyReflection = z.infer<typeof dailyReflectionSchema>;

// -----------------------------------------------------------------------------
// Session note record — freeform, untimed-to-a-session-event.
// -----------------------------------------------------------------------------
export const SESSION_NOTE_CATEGORIES = [
  "general",
  "behavior",
  "strategy",
  "mindset",
] as const;
export type SessionNoteCategory = (typeof SESSION_NOTE_CATEGORIES)[number];

// -----------------------------------------------------------------------------
// Trade reflection — separate from the daily reflection. Attached to a
// single closed-trade record via `tradeId`. Each trade can have at most
// one reflection; the slice action replaces on duplicate save.
//
// Four guided prompts (Why entered / What felt / Plan followed / Repeat
// or correct) — these are the trade-specific equivalent of the daily
// reflection prompts but scoped to the moment of one decision.
// -----------------------------------------------------------------------------
export const TRADE_REFLECTION_QUESTION_IDS = [
  "why_entered",
  "what_felt",
  "plan_followed",
  "repeat_or_correct",
] as const;
export type TradeReflectionQuestionId =
  (typeof TRADE_REFLECTION_QUESTION_IDS)[number];

export const tradeReflectionSchema = z.object({
  id: z.string(),
  tradeId: z.string(),
  // ISO of save time.
  savedAt: z.string(),
  // Trading date carried for indexing + sorting.
  tradingDate: z.string().optional(),
  // Answers keyed by question id. Loose typing — missing keys treated
  // as unanswered.
  answers: z.record(z.string(), z.string()),
});
export type TradeReflection = z.infer<typeof tradeReflectionSchema>;

// -----------------------------------------------------------------------------
// Reflection draft — in-progress writing that hasn't been finalized.
//
// Storage is keyed by `sessionId` (one draft per session), NOT by trading
// date. This prevents draft contamination across sessions: when a trader
// resets their session mid-day, the prior draft remains in storage under
// its original sessionId but does NOT auto-load into the new session.
// The Daily Reflection tab surfaces unrecovered drafts via a "Restore /
// Start Fresh" banner so the trader explicitly decides what carries over.
//
// Each draft carries:
//   * `id`              — stable per-draft identifier.
//   * `sessionId`       — REQUIRED; the session this draft belongs to.
//   * `tradingDate`     — YYYY-MM-DD context.
//   * `createdAt`       — first write timestamp (frozen).
//   * `updatedAt`       — last auto-save timestamp.
//   * `summarySnapshot` — optional behavioral summary at draft creation.
//                         Preserves the context the trader was writing
//                         against even if the live aggregator drifts.
//   * `stateAtCreation` — optional behavioral state label at draft creation.
// -----------------------------------------------------------------------------
export const reflectionDraftSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  tradingDate: z.string(),
  answers: z.record(z.string(), z.string()),
  emotionalNotes: z.string(),
  freeformNotes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  summarySnapshot: reflectionSummarySnapshotSchema.optional(),
  stateAtCreation: z.string().optional(),
});
export type ReflectionDraft = z.infer<typeof reflectionDraftSchema>;

// -----------------------------------------------------------------------------
// Notes-tab draft — the in-progress note + selected category before
// submission. One draft at a time (the textarea is a single input).
// Saving the note commits it to `sessionNotes` and clears the draft.
// -----------------------------------------------------------------------------
export const noteDraftSchema = z.object({
  content: z.string(),
  category: z.enum(SESSION_NOTE_CATEGORIES),
  updatedAt: z.string(),
});
export type NoteDraft = z.infer<typeof noteDraftSchema>;

export const sessionNoteSchema = z.object({
  id: z.string(),
  // ISO of save time.
  createdAt: z.string(),
  // YYYY-MM-DD trading date when written.
  tradingDate: z.string().optional(),
  // Session id if a session was active.
  sessionId: z.string().optional(),
  // Free text content.
  content: z.string(),
  // Optional category tag for filtering.
  category: z.enum(SESSION_NOTE_CATEGORIES).default("general"),
});
export type SessionNote = z.infer<typeof sessionNoteSchema>;
