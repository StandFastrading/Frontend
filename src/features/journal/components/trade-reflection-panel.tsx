"use client";

import { useMemo, useState } from "react";

import { useAutoSave } from "@/lib/journal/use-auto-save";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import {
  TRADE_REFLECTION_QUESTION_IDS,
  type TradeReflection,
  type TradeReflectionQuestionId,
} from "@/types";

import { SaveStatusIndicator } from "@/features/journal/components/save-status-indicator";

// Trade Reflection Panel — auto-saves directly to `tradeReflections`
// (no separate draft layer). Each trade reflection IS the persistent
// record; the trader sees what they typed any time they reopen the
// dialog. The manual Save button is replaced by the SaveStatusIndicator
// — auto-save eliminates the ceremony entirely.

const PROMPTS: ReadonlyArray<{
  id: TradeReflectionQuestionId;
  prompt: string;
  hint: string;
}> = [
  {
    id: "why_entered",
    prompt: "Why did I enter this trade?",
    hint: "The setup, the signal, the trigger — what specifically did you see.",
  },
  {
    id: "what_felt",
    prompt: "What did I feel during the trade?",
    hint: "Conviction, doubt, urgency, calm. Be honest, not flattering.",
  },
  {
    id: "plan_followed",
    prompt: "Did I follow my plan?",
    hint: "Match the actual execution against the approved plan — entry, stop, target, size.",
  },
  {
    id: "repeat_or_correct",
    prompt: "What would I repeat or correct next time?",
    hint: "One thing to keep, one thing to change. Behavioral, not P/L.",
  },
];

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type FormState = Record<TradeReflectionQuestionId, string>;

function emptyForm(): FormState {
  const out = {} as FormState;
  for (const id of TRADE_REFLECTION_QUESTION_IDS) {
    out[id] = "";
  }
  return out;
}

function hydrateForm(reflection: TradeReflection): FormState {
  const base = emptyForm();
  for (const key of Object.keys(reflection.answers)) {
    if (key in base) {
      base[key as TradeReflectionQuestionId] =
        reflection.answers[key] ?? "";
    }
  }
  return base;
}

function isFormMeaningful(form: FormState): boolean {
  for (const v of Object.values(form)) {
    if (typeof v === "string" && v.trim().length > 0) return true;
  }
  return false;
}

export function TradeReflectionPanel({
  tradeId,
  tradingDate,
}: {
  tradeId: string;
  tradingDate?: string;
}) {
  const tradeReflections = useAppStore((s) => s.tradeReflections);
  const saveTradeReflection = useAppStore((s) => s.saveTradeReflection);

  const existing = tradeReflections.find((r) => r.tradeId === tradeId) ?? null;

  // Identity-tracked seeding mirrors daily-reflection. Re-seeds only
  // when the stored record id changes (e.g., dialog reopened after a
  // delete) — live typing doesn't trip this because auto-save updates
  // the SAME record id.
  const [form, setForm] = useState<FormState>(() =>
    existing ? hydrateForm(existing) : emptyForm(),
  );
  const [lastLoadedId, setLastLoadedId] = useState<string | null>(
    existing?.id ?? null,
  );
  if (existing && existing.id !== lastLoadedId) {
    setLastLoadedId(existing.id);
    setForm(hydrateForm(existing));
  }

  // Auto-save the form directly to `tradeReflections`. The reflection
  // id is stable across edits — re-using an existing id (or minting
  // one on first save) so each trade has at most one record.
  const recordId = useMemo(
    () => existing?.id ?? genId("tref"),
    [existing],
  );
  const autoSave = useAutoSave({
    value: form,
    debounceMs: 700,
    shouldSave: (next) => isFormMeaningful(next),
    save: (next) => {
      const record: TradeReflection = {
        id: recordId,
        tradeId,
        savedAt: new Date().toISOString(),
        tradingDate,
        answers: next,
      };
      saveTradeReflection(record);
    },
    guardLeave: true,
  });

  const updateAnswer = (id: TradeReflectionQuestionId, next: string) => {
    setForm((f) => ({ ...f, [id]: next }));
  };

  return (
    <section
      aria-label="Trade reflection"
      className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-card/60 p-5 backdrop-blur"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 leading-tight">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Trade Reflection
          </span>
          <span className="text-[0.7rem] text-muted-foreground/80">
            Four prompts scoped to this single decision. Auto-saved as you write.
          </span>
        </div>
        <SaveStatusIndicator
          status={autoSave.status}
          lastSavedAt={autoSave.lastSavedAt}
        />
      </div>

      <ul className="flex flex-col gap-4">
        {PROMPTS.map((q, idx) => (
          <li key={q.id} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5 leading-tight">
              <span className="text-sm font-medium text-foreground">
                <span className="mr-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Q{idx + 1}
                </span>
                {q.prompt}
              </span>
              <span className="text-[0.65rem] leading-snug text-muted-foreground/85">
                {q.hint}
              </span>
            </div>
            <textarea
              value={form[q.id]}
              onChange={(e) => updateAnswer(q.id, e.target.value)}
              placeholder="Write here…"
              rows={2}
              className={cn(
                "w-full resize-y rounded-lg border border-white/10 bg-background/40 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60",
                "focus:border-brand/40 focus:outline-none focus:ring-1 focus:ring-brand/30",
              )}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
