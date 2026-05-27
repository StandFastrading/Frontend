"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useActiveSession } from "@/lib/sessions/session-helpers";
import { useAutoSave } from "@/lib/journal/use-auto-save";
import { getCurrentTradingDate } from "@/types";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import type { SessionNote, SessionNoteCategory } from "@/types";

import { SaveStatusIndicator } from "@/features/journal/components/save-status-indicator";

// Notes tab — freeform journal entries. Categories filter the list;
// each note shows its category badge + relative timestamp.

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: SessionNoteCategory;
  label: string;
}> = [
  { value: "general", label: "General" },
  { value: "behavior", label: "Behavioral observation" },
  { value: "strategy", label: "Strategy" },
  { value: "mindset", label: "Mindset" },
];

const CATEGORY_TONE: Record<SessionNoteCategory, string> = {
  general: "bg-foreground/[0.05] text-foreground/80 ring-white/10",
  behavior: "bg-amber-500/10 text-amber-300 ring-amber-500/25",
  strategy: "bg-brand/10 text-brand ring-brand/25",
  mindset: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
};

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotesTab() {
  const sessionNotes = useAppStore((s) => s.sessionNotes);
  const noteDraft = useAppStore((s) => s.noteDraft);
  const appendSessionNote = useAppStore((s) => s.appendSessionNote);
  const deleteSessionNote = useAppStore((s) => s.deleteSessionNote);
  const setNoteDraft = useAppStore((s) => s.setNoteDraft);
  const clearNoteDraft = useAppStore((s) => s.clearNoteDraft);
  const activeSession = useActiveSession();

  // Local form state seeded from the persisted draft so a tab switch
  // or page reload restores in-progress writing. Identity-based
  // re-seed mirrors the daily-reflection pattern — only refreshes
  // when the underlying draft genuinely changes (not on every
  // keystroke).
  const [draft, setDraft] = useState<string>(noteDraft?.content ?? "");
  const [category, setCategory] = useState<SessionNoteCategory>(
    noteDraft?.category ?? "general",
  );
  const draftSourceId = noteDraft?.updatedAt ?? "none";
  const [lastSourceId, setLastSourceId] = useState<string>(draftSourceId);
  if (draftSourceId !== lastSourceId) {
    setLastSourceId(draftSourceId);
    setDraft(noteDraft?.content ?? "");
    setCategory(noteDraft?.category ?? "general");
  }

  const [filter, setFilter] = useState<"all" | SessionNoteCategory>("all");

  const ordered = useMemo(
    () =>
      [...sessionNotes].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [sessionNotes],
  );

  const filtered = useMemo(
    () =>
      filter === "all"
        ? ordered
        : ordered.filter((n) => (n.category ?? "general") === filter),
    [ordered, filter],
  );

  // Auto-save the in-progress note. `shouldSave` skips the empty
  // initial state so we don't litter the store with a draft on first
  // mount. Clearing the draft via `clearNoteDraft` (after submission)
  // resets the persisted record so the next visit starts fresh.
  const draftValue = useMemo(
    () => ({ content: draft, category }),
    [draft, category],
  );
  const autoSave = useAutoSave({
    value: draftValue,
    debounceMs: 700,
    shouldSave: (v) => v.content.trim().length > 0,
    save: (v) => {
      setNoteDraft({
        content: v.content,
        category: v.category,
        updatedAt: new Date().toISOString(),
      });
    },
    guardLeave: true,
  });

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    // Flush any pending debounce write so the saved-draft state is
    // consistent at the moment we promote it to a finalized note.
    await autoSave.flush();
    const note: SessionNote = {
      id: genId("note"),
      createdAt: new Date().toISOString(),
      tradingDate: activeSession?.tradingDate ?? getCurrentTradingDate(),
      sessionId: activeSession?.sessionId,
      content: trimmed,
      category,
    };
    appendSessionNote(note);
    clearNoteDraft();
    setDraft("");
    setCategory("general");
    toast.success("Note saved");
  };

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-label="New note"
        className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-card/60 p-5 backdrop-blur"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              New Note
            </span>
            <SaveStatusIndicator
              status={autoSave.status}
              lastSavedAt={autoSave.lastSavedAt}
            />
          </div>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as SessionNoteCategory)
            }
            className="rounded-md border border-white/10 bg-background/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-white/20 focus:border-brand/40 focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-background"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Behavioral observation, strategy note, mindset cue…"
          rows={3}
          className={cn(
            "w-full resize-y rounded-lg border border-white/10 bg-background/40 px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60",
            "focus:border-brand/40 focus:outline-none focus:ring-1 focus:ring-brand/30",
          )}
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={draft.trim().length === 0}
            onClick={handleSubmit}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors",
              draft.trim().length === 0
                ? "cursor-not-allowed bg-foreground/[0.05] text-muted-foreground"
                : "bg-brand/90 text-brand-foreground hover:bg-brand",
            )}
          >
            <Plus className="size-4" />
            Save Note
          </button>
        </div>
      </section>

      {ordered.length > 0 ? (
        <div className="flex items-end justify-between gap-3 rounded-xl border border-white/10 bg-card/40 px-4 py-3 backdrop-blur">
          <div className="flex flex-col gap-1">
            <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              Filter by category
            </span>
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as typeof filter)
              }
              className="rounded-md border border-white/10 bg-background/40 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-white/20 focus:border-brand/40 focus:outline-none"
            >
              <option value="all" className="bg-background">
                All categories
              </option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-background"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/70">
            {filtered.length} of {ordered.length}
          </span>
        </div>
      ) : null}

      {ordered.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/10 bg-card/30 p-8 backdrop-blur">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Notes
          </span>
          <p className="max-w-md text-sm text-muted-foreground">
            Freeform behavioral observations, strategy notes, and mindset
            cues. No notes saved yet.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-card/30 p-6 text-sm text-muted-foreground">
          No notes in this category.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              onDelete={() => deleteSessionNote(note.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteRow({
  note,
  onDelete,
}: {
  note: SessionNote;
  onDelete: () => void;
}) {
  const category = (note.category ?? "general") as SessionNoteCategory;
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-white/10 bg-card/40 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] ring-1",
            CATEGORY_TONE[category],
          )}
        >
          {CATEGORY_OPTIONS.find((o) => o.value === category)?.label ??
            "General"}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[0.65rem] tabular-nums text-muted-foreground">
            {formatRelative(note.createdAt)}
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-rose-500/[0.08] hover:text-rose-300"
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {note.content}
      </p>
    </li>
  );
}
