"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

import { REFLECTION_QUESTIONS } from "@/lib/reflection/reflection-engine";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import type { DailyReflection, ReflectionQuestionId } from "@/types";

import { StateBadge } from "@/features/journal/components/state-badge";

// Reflection History — chronological list of saved reflections with
// filters. Each card expands inline to reveal the full reflection
// text (six question answers + emotional + freeform notes).

type DisciplineFilter = "all" | "high" | "mid" | "low" | "critical";

type Filters = {
  state: string; // "all" | specific state label
  discipline: DisciplineFilter;
  flag: "all" | "escalation" | "overtrading" | "warning_overrides";
};

const STATE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "all", label: "Any state" },
  { value: "focused", label: "Focused" },
  { value: "controlled", label: "Controlled" },
  { value: "stable", label: "Stable" },
  { value: "overtrading", label: "Overtrading" },
  { value: "escalating", label: "Escalating" },
  { value: "reactive", label: "Reactive" },
  { value: "impulsive", label: "Impulsive" },
  { value: "fatigued", label: "Fatigued" },
  { value: "locked_down", label: "Locked Down" },
];

const DISCIPLINE_OPTIONS: ReadonlyArray<{
  value: DisciplineFilter;
  label: string;
}> = [
  { value: "all", label: "Any score" },
  { value: "high", label: "≥ 75" },
  { value: "mid", label: "55 – 74" },
  { value: "low", label: "35 – 54" },
  { value: "critical", label: "< 35" },
];

const FLAG_OPTIONS: ReadonlyArray<{ value: Filters["flag"]; label: string }> = [
  { value: "all", label: "Any flag" },
  { value: "escalation", label: "Escalation" },
  { value: "overtrading", label: "Overtrading" },
  { value: "warning_overrides", label: "Warning overrides" },
];

function matchesDiscipline(score: number, filter: DisciplineFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "high":
      return score >= 75;
    case "mid":
      return score >= 55 && score < 75;
    case "low":
      return score >= 35 && score < 55;
    case "critical":
      return score < 35;
  }
}

function matchesFlag(
  reflection: DailyReflection,
  filter: Filters["flag"],
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "escalation":
      return reflection.summary.escalationDetected;
    case "overtrading":
      return reflection.summary.overtradingDetected;
    case "warning_overrides":
      return reflection.summary.warningOverrides > 0;
  }
}

function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return yyyyMmDd;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-white/10 bg-background/40 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-white/20 focus:border-brand/40 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-background">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ReflectionHistoryTab() {
  const reflections = useAppStore((s) => s.reflections);
  const deleteReflection = useAppStore((s) => s.deleteReflection);

  const [filters, setFilters] = useState<Filters>({
    state: "all",
    discipline: "all",
    flag: "all",
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const ordered = useMemo(
    () =>
      [...reflections].sort((a, b) =>
        b.tradingDate.localeCompare(a.tradingDate),
      ),
    [reflections],
  );

  const filtered = useMemo(
    () =>
      ordered.filter((r) => {
        if (filters.state !== "all" && r.summary.state !== filters.state)
          return false;
        if (!matchesDiscipline(r.summary.disciplineScore, filters.discipline))
          return false;
        if (!matchesFlag(r, filters.flag)) return false;
        return true;
      }),
    [ordered, filters],
  );

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (ordered.length === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/10 bg-card/30 p-8 backdrop-blur">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Reflection History
        </span>
        <p className="max-w-md text-sm text-muted-foreground">
          Saved reflections will appear here chronologically. Open the
          Daily Reflection tab to record today&rsquo;s session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-white/10 bg-card/40 p-4 backdrop-blur">
        <FilterSelect
          label="State"
          value={filters.state}
          options={STATE_OPTIONS}
          onChange={(next) => setFilters((f) => ({ ...f, state: next }))}
        />
        <FilterSelect
          label="Discipline"
          value={filters.discipline}
          options={DISCIPLINE_OPTIONS}
          onChange={(next) =>
            setFilters((f) => ({ ...f, discipline: next }))
          }
        />
        <FilterSelect
          label="Behavioral flag"
          value={filters.flag}
          options={FLAG_OPTIONS}
          onChange={(next) => setFilters((f) => ({ ...f, flag: next }))}
        />
        <span className="ml-auto text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground/70">
          {filtered.length} of {ordered.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-card/30 p-6 text-sm text-muted-foreground">
          No reflections match these filters.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((reflection) => (
            <ReflectionHistoryCard
              key={reflection.id}
              reflection={reflection}
              expanded={expanded.has(reflection.id)}
              onToggle={() => toggleExpanded(reflection.id)}
              onDelete={() => deleteReflection(reflection.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReflectionHistoryCard({
  reflection,
  expanded,
  onToggle,
  onDelete,
}: {
  reflection: DailyReflection;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  // Top behavioral issue — the dominant signal worth surfacing in the
  // collapsed header. Priority: lockout > escalation cluster > warning
  // override > stop widening > overtrading > clean.
  const summary = reflection.summary;
  const topIssue =
    summary.lockoutActive
      ? "Daily lockout triggered"
      : summary.biggestClusterLabel
        ? summary.biggestClusterLabel
        : summary.warningOverrides > 0
          ? `${summary.warningOverrides} warning override${summary.warningOverrides === 1 ? "" : "s"}`
          : summary.stopWidenEvents > 0
            ? "Stop discipline weakened"
            : summary.overtradingDetected
              ? "Overtrading flagged"
              : "Clean session";

  const disciplineTone =
    summary.disciplineScore >= 75
      ? "text-emerald-300"
      : summary.disciplineScore >= 55
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <li className="rounded-xl border border-white/10 bg-card/40 backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
      >
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <div className="flex flex-col gap-1 leading-tight">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">
              {formatDate(reflection.tradingDate)}
            </span>
            <StateBadge state={summary.state} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-muted-foreground">
            <span>Top issue · {topIssue}</span>
            <span className="text-muted-foreground/60">·</span>
            <span>Focus · {reflection.tomorrowFocus}</span>
          </div>
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span
            className={cn(
              "text-base font-semibold tabular-nums",
              disciplineTone,
            )}
          >
            {summary.disciplineScore}
            <span className="text-[0.65rem] font-normal text-muted-foreground">
              /100
            </span>
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
            {summary.disciplineBandLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-rose-500/[0.08] hover:text-rose-300"
          aria-label="Delete reflection"
          title="Delete reflection"
        >
          <Trash2 className="size-3.5" />
        </button>
      </button>

      {expanded ? <ReflectionDetail reflection={reflection} /> : null}
    </li>
  );
}

function ReflectionDetail({ reflection }: { reflection: DailyReflection }) {
  return (
    <div className="flex flex-col gap-4 border-t border-white/5 px-4 py-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.7rem]">
        <Stat label="Warning Overrides" value={reflection.summary.warningOverrides} />
        <Stat label="Stop Widen Events" value={reflection.summary.stopWidenEvents} />
        <Stat
          label="Size Escalations"
          value={reflection.summary.positionSizeIncreases}
        />
        <Stat label="Rapid Re-entries" value={reflection.summary.rapidReentries} />
        <Stat label="Interventions" value={reflection.summary.totalInterventions} />
        <Stat
          label="Controlled Trades"
          value={reflection.summary.cleanExecutions}
        />
      </div>

      <div className="rounded-lg border border-white/10 bg-background/30 p-3">
        <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Behavioral observation (frozen)
        </span>
        <p className="mt-1 text-xs leading-relaxed text-foreground/85">
          {reflection.insight}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {REFLECTION_QUESTIONS.map((q, idx) => {
          const answer = reflection.answers[q.id] ?? "";
          if (!answer.trim()) return null;
          return (
            <li
              key={q.id}
              className="rounded-lg border border-white/5 bg-background/20 p-3"
            >
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Q{idx + 1} · {q.prompt}
              </span>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                {answer}
              </p>
            </li>
          );
        })}
      </ul>

      {reflection.emotionalNotes.trim() ? (
        <DetailNote label="Emotional notes" body={reflection.emotionalNotes} />
      ) : null}
      {reflection.freeformNotes.trim() ? (
        <DetailNote label="Freeform notes" body={reflection.freeformNotes} />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </span>
      <span className="font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function DetailNote({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-background/20 p-3">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
        {body}
      </p>
    </div>
  );
}

// Re-export the question id type for consumers that don't import @/types
// directly.
export type { ReflectionQuestionId };
