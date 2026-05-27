"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, History, X } from "lucide-react";
import { toast } from "sonner";

import { useBehavioralDetection } from "@/lib/detection/behavioral-detection-engine";
import { useBehavioralStateAggregation } from "@/lib/state/behavioral-state-aggregator";
import {
  buildBehavioralInsight,
  buildReflectionSummary,
  buildTomorrowFocus,
  type ReflectionEngineInputs,
} from "@/lib/reflection/reflection-engine";
import {
  useCurrentSessionEvents,
  useCurrentSessionInterventions,
  useCurrentSessionTrades,
} from "@/lib/sessions/session-helpers";
import { useAutoSave } from "@/lib/journal/use-auto-save";
import { getCurrentTradingDate } from "@/types";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import type {
  DailyReflection,
  ReflectionDraft,
  ReflectionSummarySnapshot,
} from "@/types";

import { BehavioralInsightCard } from "@/features/journal/components/behavioral-insight-card";
import {
  ReflectionQuestionsForm,
  emptyReflectionFormState,
  type ReflectionFormState,
} from "@/features/journal/components/reflection-questions-form";
import { ReflectionSummaryCard } from "@/features/journal/components/reflection-summary-card";
import { SaveStatusIndicator } from "@/features/journal/components/save-status-indicator";
import { TomorrowFocusCard } from "@/features/journal/components/tomorrow-focus-card";

// Daily Reflection tab — auto-save + finalize flow.
//
//   1. Drafts are keyed by SESSION ID, not trading date. A session
//      reset never auto-loads the prior session's text into the new
//      session — instead, the trader sees a recovery banner offering
//      "Restore Draft" or "Start Fresh".
//   2. Form state is local React state, initialized from (priority
//      order): the current-session draft → today's finalized
//      reflection → empty.
//   3. `useAutoSave` writes the form state to the draft on a 700 ms
//      debounce. Drafts persist across tab switches + page reloads
//      via the zustand `persist` middleware.
//   4. "Finalize Reflection" builds the full DailyReflection record
//      (frozen snapshot + insight + focus copy) and dispatches
//      `finalizeReflection`, which writes to history + clears the
//      current-session draft atomically.

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function DailyReflectionTab() {
  const aggregation = useBehavioralStateAggregation();
  const detection = useBehavioralDetection();
  const behaviorEvents = useCurrentSessionEvents();
  const interventions = useCurrentSessionInterventions();
  const { closedTrades } = useCurrentSessionTrades();
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const reflections = useAppStore((s) => s.reflections);
  const reflectionDrafts = useAppStore((s) => s.reflectionDrafts);
  const finalizeReflection = useAppStore((s) => s.finalizeReflection);
  const updateReflectionDraft = useAppStore((s) => s.updateReflectionDraft);
  const discardReflectionDraft = useAppStore(
    (s) => s.discardReflectionDraft,
  );
  const recoverReflectionDraft = useAppStore(
    (s) => s.recoverReflectionDraft,
  );

  const engineInputs: ReflectionEngineInputs = useMemo(
    () => ({
      aggregation,
      detection,
      behaviorEvents,
      interventions,
      closedTrades,
    }),
    [aggregation, detection, behaviorEvents, interventions, closedTrades],
  );

  const summary = useMemo(
    () => buildReflectionSummary(engineInputs),
    [engineInputs],
  );
  const insight = useMemo(
    () => buildBehavioralInsight(engineInputs),
    [engineInputs],
  );
  const focus = useMemo(
    () => buildTomorrowFocus(engineInputs),
    [engineInputs],
  );

  const tradingDate = useMemo(() => getCurrentTradingDate(), []);

  // Active draft = the one tied to the CURRENT session. If there's no
  // active session, there's no current draft slot.
  const activeDraft: ReflectionDraft | null = activeSessionId
    ? (reflectionDrafts[activeSessionId] ?? null)
    : null;

  // Recoverable drafts = drafts for today's tradingDate from a DIFFERENT
  // session that still carry meaningful content. These are the entries
  // the user can choose to restore. Ordered newest-first so the banner
  // shows the most recent prior work.
  const recoverableDrafts = useMemo(() => {
    return Object.values(reflectionDrafts)
      .filter((d) => d.sessionId !== activeSessionId)
      .filter((d) => d.tradingDate === tradingDate)
      .filter((d) => draftHasMeaningfulContent(d))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [reflectionDrafts, activeSessionId, tradingDate]);

  const existing = useMemo(
    () => reflections.find((r) => r.tradingDate === tradingDate) ?? null,
    [reflections, tradingDate],
  );

  // Form-state seeding order: current-session draft → finalized
  // reflection → empty. The recoverable-draft set is intentionally NOT
  // seeded automatically — that's the whole point of the recovery
  // banner. Identity-tracked re-seed is the same pattern used elsewhere
  // in the journal so we don't trip the setState-in-effect lint.
  const seedFor = (): {
    state: ReflectionFormState;
    sourceId: string;
  } => {
    if (activeDraft) {
      return {
        state: {
          answers: {
            ...emptyReflectionFormState().answers,
            ...activeDraft.answers,
          },
          emotionalNotes: activeDraft.emotionalNotes,
          freeformNotes: activeDraft.freeformNotes,
        },
        sourceId: `draft:${activeDraft.id}:${activeDraft.updatedAt}`,
      };
    }
    if (existing) {
      return {
        state: hydrateFormFromReflection(existing),
        sourceId: `final:${existing.id}`,
      };
    }
    return {
      state: emptyReflectionFormState(),
      sourceId: `empty:${activeSessionId ?? "no-session"}:${tradingDate}`,
    };
  };

  const [form, setForm] = useState<ReflectionFormState>(() => seedFor().state);
  const [lastSourceId, setLastSourceId] = useState<string>(() => seedFor().sourceId);

  // Re-seed only when the SOURCE genuinely changes — switching sessions,
  // a finalize on another device, or recovery moving a draft into this
  // session. Live edits to `form` don't trip this because they don't
  // change `activeDraft.updatedAt` until the auto-save lands, and at
  // that point the form already matches.
  const targetSeed = (() => {
    if (activeDraft)
      return `draft:${activeDraft.id}:${activeDraft.updatedAt}`;
    if (existing) return `final:${existing.id}`;
    return `empty:${activeSessionId ?? "no-session"}:${tradingDate}`;
  })();
  if (targetSeed !== lastSourceId) {
    const fresh = seedFor();
    setLastSourceId(fresh.sourceId);
    setForm(fresh.state);
  }

  // Frozen snapshot captured at draft creation — preserves the context
  // the trader was writing against even if the live aggregator drifts.
  const draftSummarySnapshot: ReflectionSummarySnapshot = summary;
  const draftStateAtCreation: string = aggregation.state;

  // Auto-save the form to the draft slice. `shouldSave` guards against
  // persisting an empty draft on first mount AND against writing when
  // there's no active session — drafts require a session under the new
  // model. `updateReflectionDraft` captures the latest action via the
  // closure that's re-created each render; the auto-save hook syncs the
  // latest closure into a ref so debounced + unmount writes always use
  // the freshest reference.
  const autoSave = useAutoSave({
    value: form,
    debounceMs: 700,
    shouldSave: (next) =>
      activeSessionId != null && isFormMeaningful(next),
    save: (next) => {
      if (!activeSessionId) return;
      updateReflectionDraft(activeSessionId, {
        tradingDate,
        answers: next.answers,
        emotionalNotes: next.emotionalNotes,
        freeformNotes: next.freeformNotes,
        summarySnapshot: draftSummarySnapshot,
        stateAtCreation: draftStateAtCreation,
      });
    },
    guardLeave: true,
  });

  const handleFinalize = async () => {
    if (!activeSessionId) return;
    // Flush any pending debounce write first so the finalized record
    // includes the latest text even if the trader clicks within the
    // debounce window.
    await autoSave.flush();
    const record: DailyReflection = {
      id: existing?.id ?? genId("ref"),
      tradingDate,
      sessionId: activeSessionId,
      savedAt: new Date().toISOString(),
      answers: form.answers,
      emotionalNotes: form.emotionalNotes,
      freeformNotes: form.freeformNotes,
      summary,
      insight,
      tomorrowFocus: focus,
    };
    finalizeReflection(record);
    toast.success(
      existing
        ? "Reflection updated and finalized"
        : "Reflection finalized — added to Reflection History",
    );
  };

  // Restore the most recent recoverable draft into the active session.
  // The slice moves content under the new session id and drops the
  // source atomically; the seed-identity pattern then re-hydrates the
  // form on next render.
  const handleRestoreDraft = () => {
    if (!activeSessionId || recoverableDrafts.length === 0) return;
    const source = recoverableDrafts[0];
    recoverReflectionDraft(source.sessionId, activeSessionId);
    toast.success("Restored prior reflection draft");
  };

  // Discard every recoverable draft for today. Explicit user action —
  // safe to permanently drop because the trader made the call.
  const handleStartFresh = () => {
    for (const d of recoverableDrafts) {
      discardReflectionDraft(d.sessionId);
    }
    toast.success("Started a fresh reflection for this session");
  };

  const draftPresent = activeDraft != null;
  const finalizedToday = existing != null;
  const canFinalize = activeSessionId != null && isFormMeaningful(form);
  const showRecoveryBanner =
    activeSessionId != null &&
    activeDraft == null &&
    recoverableDrafts.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Close the Loop on Today
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Behavior compounds. Reflection exposes patterns before they
          become identity.
        </p>
      </header>

      {showRecoveryBanner ? (
        <DraftRecoveryBanner
          count={recoverableDrafts.length}
          mostRecentAt={recoverableDrafts[0].updatedAt}
          onRestore={handleRestoreDraft}
          onStartFresh={handleStartFresh}
        />
      ) : null}

      <ReflectionSummaryCard summary={summary} />

      <ReflectionQuestionsForm state={form} onChange={setForm} />

      <BehavioralInsightCard insight={insight} />

      <TomorrowFocusCard focus={focus} />

      <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-card/60 p-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 leading-tight">
          <div className="flex items-center gap-3">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {finalizedToday
                ? "Finalized today"
                : draftPresent
                  ? "Draft in progress"
                  : "Not yet written"}
            </span>
            <SaveStatusIndicator
              status={autoSave.status}
              lastSavedAt={autoSave.lastSavedAt}
            />
          </div>
          <span className="text-[0.7rem] text-muted-foreground/80">
            {activeSessionId == null
              ? "Start a session to save your reflection draft."
              : finalizedToday
                ? "Auto-save keeps the latest edits. Finalize again to update Reflection History."
                : "Drafts auto-save while you write. Finalize to commit this reflection to History."}
          </span>
        </div>
        <button
          type="button"
          onClick={handleFinalize}
          disabled={!canFinalize}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
            canFinalize
              ? "bg-brand/90 text-brand-foreground hover:bg-brand"
              : "cursor-not-allowed bg-foreground/[0.05] text-muted-foreground",
          )}
        >
          <CheckCircle2 className="size-4" />
          Finalize Reflection
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Recovery banner — shown when an unfinished draft from a prior session
// exists for today's trading date. Calm tone, two explicit choices.
// -----------------------------------------------------------------------------
function DraftRecoveryBanner({
  count,
  mostRecentAt,
  onRestore,
  onStartFresh,
}: {
  count: number;
  mostRecentAt: string;
  onRestore: () => void;
  onStartFresh: () => void;
}) {
  return (
    <section
      aria-label="Recover unfinished reflection draft"
      className="flex flex-col gap-3 rounded-2xl border border-brand/25 bg-brand/[0.06] p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3 leading-tight">
        <History className="mt-0.5 size-4 shrink-0 text-brand/90" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            {count === 1
              ? "You have an unfinished reflection from your previous session."
              : `You have ${count} unfinished reflections from previous sessions today.`}
          </span>
          <span className="text-[0.7rem] text-muted-foreground">
            Last edited {formatRelativeTime(mostRecentAt)}. Restore it
            into this session, or start fresh — nothing will be lost
            until you choose.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          onClick={onStartFresh}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
        >
          <X className="size-3.5" />
          Start Fresh
        </button>
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand/90 px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand"
        >
          <History className="size-3.5" />
          Restore Draft
        </button>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function hydrateFormFromReflection(
  reflection: DailyReflection,
): ReflectionFormState {
  const base = emptyReflectionFormState();
  for (const key of Object.keys(reflection.answers)) {
    if (key in base.answers) {
      base.answers[key as keyof typeof base.answers] =
        reflection.answers[key] ?? "";
    }
  }
  return {
    answers: base.answers,
    emotionalNotes: reflection.emotionalNotes,
    freeformNotes: reflection.freeformNotes,
  };
}

// True if any meaningful text has been written. Guards the auto-save
// from persisting empty drafts on first mount + the Finalize button
// from committing an empty reflection.
function isFormMeaningful(form: ReflectionFormState): boolean {
  if (form.emotionalNotes.trim().length > 0) return true;
  if (form.freeformNotes.trim().length > 0) return true;
  for (const v of Object.values(form.answers)) {
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

// True if the persisted draft itself has anything worth recovering.
// Identical predicate to `isFormMeaningful` but against the persisted
// shape — a recoverable draft must actually contain words, not just be
// a stale empty record.
function draftHasMeaningfulContent(draft: ReflectionDraft): boolean {
  if (draft.emotionalNotes.trim().length > 0) return true;
  if (draft.freeformNotes.trim().length > 0) return true;
  for (const v of Object.values(draft.answers)) {
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "earlier";
  const delta = Date.now() - t;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} min ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} h ago`;
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Re-export the draft type so consumers reading from this module
// don't need a parallel import.
export type { ReflectionDraft };
