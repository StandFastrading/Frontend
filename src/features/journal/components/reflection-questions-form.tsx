"use client";

import { REFLECTION_QUESTIONS } from "@/lib/reflection/reflection-engine";
import { cn } from "@/lib/utils";
import type { ReflectionQuestionId } from "@/types";

// Six guided reflection prompts + emotional notes + freeform notes.
// State lives in the parent (DailyReflectionTab) so the save handler
// has full visibility. Each textarea is autosizing via min-h + grow.

export type ReflectionFormState = {
  answers: Record<ReflectionQuestionId, string>;
  emotionalNotes: string;
  freeformNotes: string;
};

export type ReflectionFormChange = (next: ReflectionFormState) => void;

function FieldLabel({
  label,
  hint,
  index,
}: {
  label: string;
  hint?: string;
  index?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="text-sm font-semibold text-foreground">
        {index != null ? (
          <span className="mr-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Q{index}
          </span>
        ) : null}
        {label}
      </span>
      {hint ? (
        <span className="text-[0.7rem] leading-snug text-muted-foreground/85">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function ReflectionTextarea({
  value,
  onChange,
  placeholder = "Write here…",
  minRows = 3,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className={cn(
        "w-full resize-y rounded-lg border border-white/10 bg-background/40 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60",
        "focus:border-brand/40 focus:outline-none focus:ring-1 focus:ring-brand/30",
      )}
    />
  );
}

export function ReflectionQuestionsForm({
  state,
  onChange,
}: {
  state: ReflectionFormState;
  onChange: ReflectionFormChange;
}) {
  const updateAnswer = (id: ReflectionQuestionId, next: string) => {
    onChange({
      ...state,
      answers: { ...state.answers, [id]: next },
    });
  };

  return (
    <section
      aria-label="Reflection questions"
      className="flex flex-col gap-5 rounded-2xl border border-white/15 bg-card/60 p-5 backdrop-blur sm:p-6"
    >
      <div className="flex flex-col gap-1.5 leading-tight">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Guided Reflection
        </span>
        <span className="text-[0.7rem] text-muted-foreground/80">
          Honest answers compound. Short and specific beats long and
          vague.
        </span>
      </div>

      <ul className="flex flex-col gap-5">
        {REFLECTION_QUESTIONS.map((question, idx) => (
          <li key={question.id} className="flex flex-col gap-2">
            <FieldLabel
              label={question.prompt}
              hint={question.hint}
              index={idx + 1}
            />
            <ReflectionTextarea
              value={state.answers[question.id] ?? ""}
              onChange={(next) => updateAnswer(question.id, next)}
              placeholder="Write here…"
              minRows={3}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4 border-t border-white/5 pt-5">
        <div className="flex flex-col gap-2">
          <FieldLabel
            label="Emotional notes (optional)"
            hint="How did you feel during today's session? Energy, frustration, conviction, doubt."
          />
          <ReflectionTextarea
            value={state.emotionalNotes}
            onChange={(next) =>
              onChange({ ...state, emotionalNotes: next })
            }
            placeholder="Optional…"
            minRows={2}
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel
            label="Freeform notes (optional)"
            hint="Anything that didn't fit the questions above."
          />
          <ReflectionTextarea
            value={state.freeformNotes}
            onChange={(next) =>
              onChange({ ...state, freeformNotes: next })
            }
            placeholder="Optional…"
            minRows={2}
          />
        </div>
      </div>
    </section>
  );
}

// Builds the empty form state — answers keyed by question id with empty
// strings. Used by the tab to initialize from scratch.
export function emptyReflectionFormState(): ReflectionFormState {
  const answers = {} as Record<ReflectionQuestionId, string>;
  for (const q of REFLECTION_QUESTIONS) {
    answers[q.id] = "";
  }
  return { answers, emotionalNotes: "", freeformNotes: "" };
}
