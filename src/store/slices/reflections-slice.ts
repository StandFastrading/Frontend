import {
  dailyReflectionMapper,
  enqueueSync,
  sessionNoteMapper,
  tradeReflectionMapper,
} from "@/lib/sync";
import type {
  DailyReflection,
  NoteDraft,
  ReflectionDraft,
  ReflectionSummarySnapshot,
  SessionNote,
  TradeReflection,
} from "@/types";
import type { SliceCreator } from "@/store/types";

// Server sync notes:
// - Finalized daily reflections, finalized trade reflections, and session
//   notes ARE persisted server-side.
// - reflection drafts + the notes-tab in-progress draft are LOCAL ONLY per
//   the v1 product decision (chatty auto-save + drafts are transient).
//   Cross-device draft sync is a v2 feature.

// =============================================================================
// Reflections + Session Notes slice
// =============================================================================
//
// Persisted records produced by the Journal section. Reflections are
// dedupped by `tradingDate` — only one reflection per trading day; saving
// twice replaces the prior entry. Notes are append-only chronological.
//
// Reflection drafts are keyed by SESSION ID (not trading date) so a
// session reset doesn't auto-load the prior session's draft into the new
// session. Unrecovered drafts remain in storage; the Daily Reflection
// tab surfaces them via a recovery banner so the trader explicitly
// decides what carries forward.
//
// Neither finalized reflections nor session notes are touched by
// `resetTodaysSession` — they're user-authored journal entries, not
// session-scoped behavioral signals, so a dev reset doesn't wipe them.
// Use the delete actions from the UI to remove individual records.
// =============================================================================

// Patch shape sent in by the auto-save layer. The slice fills in
// id/createdAt on first write so callers don't need to know whether the
// draft already exists.
export type ReflectionDraftPatch = {
  tradingDate: string;
  answers: Record<string, string>;
  emotionalNotes: string;
  freeformNotes: string;
  summarySnapshot?: ReflectionSummarySnapshot;
  stateAtCreation?: string;
};

function genDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type ReflectionsSlice = {
  reflections: DailyReflection[];
  sessionNotes: SessionNote[];
  // Per-trade reflections, keyed by tradeId. Dedup-on-save (one
  // reflection per trade); replacing on duplicate is the intended UX
  // so the trader can edit + re-save without losing the prior text.
  tradeReflections: TradeReflection[];
  // ---------- Auto-save drafts ----------
  // In-progress reflection writes, keyed by SESSION ID. One draft per
  // session; multiple sessions on the same trading date each get their
  // own draft slot. `useAutoSave` updates the current session's draft
  // on debounce; recovery actions move content between session keys.
  reflectionDrafts: Record<string, ReflectionDraft>;
  // One Notes-tab draft at a time (the textarea is a single input).
  noteDraft: NoteDraft | null;

  // Save (or replace existing) for the reflection's `tradingDate`.
  // Use `finalizeReflection` from the journal flow — `saveReflection`
  // is kept as a public action for compatibility but doesn't clear the
  // draft.
  saveReflection: (reflection: DailyReflection) => void;
  deleteReflection: (id: string) => void;
  // Append a freeform note. Newest-first ordering inside the slice; UI
  // can re-sort if needed.
  appendSessionNote: (note: SessionNote) => void;
  deleteSessionNote: (id: string) => void;
  // Save (or replace existing) trade reflection by tradeId.
  saveTradeReflection: (reflection: TradeReflection) => void;
  deleteTradeReflection: (id: string) => void;

  // ---------- Draft actions ----------
  // Merge a patch into the reflection draft for `sessionId`. Creates
  // the draft on first call (mints id + stamps createdAt). On
  // subsequent calls, preserves id + createdAt and bumps updatedAt.
  updateReflectionDraft: (
    sessionId: string,
    patch: ReflectionDraftPatch,
  ) => void;
  // Remove the draft for a session. Used internally by finalize and by
  // the explicit "Start Fresh" recovery path.
  clearReflectionDraft: (sessionId: string) => void;
  // User-initiated discard. Same effect as clear, but named for the
  // call-site so the intent is explicit in the trace.
  discardReflectionDraft: (sessionId: string) => void;
  // Move a draft from one session to another (Restore Draft flow).
  // Preserves id + createdAt; re-stamps sessionId + updatedAt. The
  // source entry is removed atomically so the draft can only ever
  // belong to one session at a time.
  recoverReflectionDraft: (
    fromSessionId: string,
    toSessionId: string,
  ) => void;
  // Atomic: write to history + clear the draft for the finalized
  // reflection's sessionId.
  finalizeReflection: (reflection: DailyReflection) => void;
  // Notes tab draft — full-replace (null to clear).
  setNoteDraft: (draft: NoteDraft | null) => void;
  clearNoteDraft: () => void;
};

export const createReflectionsSlice: SliceCreator<ReflectionsSlice> = (
  set,
  get,
) => ({
  reflections: [],
  sessionNotes: [],
  tradeReflections: [],
  reflectionDrafts: {},
  noteDraft: null,

  saveReflection: (reflection) => {
    set((state) => ({
      reflections: [
        reflection,
        ...state.reflections.filter(
          (r) => r.tradingDate !== reflection.tradingDate,
        ),
      ],
    }));
    const userId = get().userId;
    if (userId) {
      enqueueSync({
        table: "daily_reflections",
        op: "upsert",
        payload: dailyReflectionMapper.toUpsert(reflection, userId),
        onConflict: "user_id,trading_date",
      });
    }
  },

  deleteReflection: (id) => {
    const target = get().reflections.find((r) => r.id === id);
    set((state) => ({
      reflections: state.reflections.filter((r) => r.id !== id),
    }));
    const userId = get().userId;
    if (userId && target) {
      enqueueSync({
        table: "daily_reflections",
        op: "delete",
        payload: {},
        match: { user_id: userId, trading_date: target.tradingDate },
      });
    }
  },

  appendSessionNote: (note) => {
    set((state) => ({
      sessionNotes: [note, ...state.sessionNotes],
    }));
    const userId = get().userId;
    if (userId) {
      enqueueSync({
        table: "session_notes",
        op: "insert",
        payload: sessionNoteMapper.toInsert(note, userId),
      });
    }
  },

  deleteSessionNote: (id) => {
    set((state) => ({
      sessionNotes: state.sessionNotes.filter((n) => n.id !== id),
    }));
    // session_notes is append-only at the RLS layer — deletes are local only.
    // To remove server-side records, a future "delete journal entry" RPC
    // would relax the policy. Surface this gap if traders ask for it.
  },

  saveTradeReflection: (reflection) => {
    set((state) => ({
      tradeReflections: [
        reflection,
        ...state.tradeReflections.filter(
          (r) => r.tradeId !== reflection.tradeId,
        ),
      ],
    }));
    const userId = get().userId;
    if (userId) {
      enqueueSync({
        table: "trade_reflections",
        op: "upsert",
        payload: tradeReflectionMapper.toUpsert(reflection, userId),
        onConflict: "user_id,trade_id",
      });
    }
  },

  deleteTradeReflection: (id) => {
    const target = get().tradeReflections.find((r) => r.id === id);
    set((state) => ({
      tradeReflections: state.tradeReflections.filter((r) => r.id !== id),
    }));
    const userId = get().userId;
    if (userId && target) {
      enqueueSync({
        table: "trade_reflections",
        op: "delete",
        payload: {},
        match: { user_id: userId, trade_id: target.tradeId },
      });
    }
  },

  updateReflectionDraft: (sessionId, patch) =>
    set((state) => {
      const now = new Date().toISOString();
      const existing = state.reflectionDrafts[sessionId];
      const next: ReflectionDraft = existing
        ? {
            ...existing,
            // Re-anchor the trading date in case the session crossed
            // midnight while the trader was writing.
            tradingDate: patch.tradingDate,
            answers: patch.answers,
            emotionalNotes: patch.emotionalNotes,
            freeformNotes: patch.freeformNotes,
            // Frozen context fields are only set on first write — later
            // patches preserve whatever was captured at creation.
            summarySnapshot:
              existing.summarySnapshot ?? patch.summarySnapshot,
            stateAtCreation:
              existing.stateAtCreation ?? patch.stateAtCreation,
            updatedAt: now,
          }
        : {
            id: genDraftId(),
            sessionId,
            tradingDate: patch.tradingDate,
            answers: patch.answers,
            emotionalNotes: patch.emotionalNotes,
            freeformNotes: patch.freeformNotes,
            summarySnapshot: patch.summarySnapshot,
            stateAtCreation: patch.stateAtCreation,
            createdAt: now,
            updatedAt: now,
          };
      return {
        reflectionDrafts: { ...state.reflectionDrafts, [sessionId]: next },
      };
    }),

  clearReflectionDraft: (sessionId) =>
    set((state) => {
      if (!(sessionId in state.reflectionDrafts)) return state;
      const { [sessionId]: _drop, ...rest } = state.reflectionDrafts;
      void _drop;
      return { reflectionDrafts: rest };
    }),

  discardReflectionDraft: (sessionId) =>
    set((state) => {
      if (!(sessionId in state.reflectionDrafts)) return state;
      const { [sessionId]: _drop, ...rest } = state.reflectionDrafts;
      void _drop;
      return { reflectionDrafts: rest };
    }),

  // Move a draft to a new session id. Preserves id + createdAt + content;
  // re-stamps sessionId + updatedAt. The source entry is removed in the
  // same `set` so the draft only ever belongs to one session.
  recoverReflectionDraft: (fromSessionId, toSessionId) =>
    set((state) => {
      const source = state.reflectionDrafts[fromSessionId];
      if (!source) return state;
      if (fromSessionId === toSessionId) return state;
      const moved: ReflectionDraft = {
        ...source,
        sessionId: toSessionId,
        updatedAt: new Date().toISOString(),
      };
      const { [fromSessionId]: _drop, ...rest } = state.reflectionDrafts;
      void _drop;
      return {
        reflectionDrafts: { ...rest, [toSessionId]: moved },
      };
    }),

  // Atomic finalize — append to history (dedup by tradingDate, same as
  // saveReflection) AND drop the draft for the finalized session in the
  // same set. The draft is intentionally kept until the write lands so a
  // failed finalize doesn't lose work; for the local-only persistence
  // this is essentially synchronous, but the contract is set so a future
  // backend-write path can keep the same guarantee.
  finalizeReflection: (reflection) => {
    set((state) => {
      const draftKey = reflection.sessionId;
      const rest =
        draftKey && draftKey in state.reflectionDrafts
          ? Object.fromEntries(
              Object.entries(state.reflectionDrafts).filter(
                ([k]) => k !== draftKey,
              ),
            )
          : state.reflectionDrafts;
      return {
        reflections: [
          reflection,
          ...state.reflections.filter(
            (r) => r.tradingDate !== reflection.tradingDate,
          ),
        ],
        reflectionDrafts: rest,
      };
    });
    const userId = get().userId;
    if (userId) {
      enqueueSync({
        table: "daily_reflections",
        op: "upsert",
        payload: dailyReflectionMapper.toUpsert(reflection, userId),
        onConflict: "user_id,trading_date",
      });
    }
  },

  setNoteDraft: (draft) => set(() => ({ noteDraft: draft })),
  clearNoteDraft: () => set(() => ({ noteDraft: null })),
});
