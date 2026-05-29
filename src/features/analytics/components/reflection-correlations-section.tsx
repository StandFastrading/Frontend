"use client";

import { useMemo } from "react";
import {
  AlignLeft,
  Brain,
  MessageSquareText,
  ShieldCheck,
  Waves,
  type LucideIcon,
} from "lucide-react";

import {
  computeReflectionCorrelations,
  REFLECTION_THEME_LABEL,
  type ReflectionCorrelationSummary,
  type ThemeCorrelation,
} from "@/lib/analytics/reflection-correlation-engine";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import { useAppStore } from "@/store";

// SECTION — Reflection Correlations
//
// Five cards that pair reflection language with observed behavior. All
// numbers come from the deterministic engine; this component only
// formats + renders.
//
// Tone is intentionally observational: language is "self-reported
// context," never a diagnosis. The empty state never invents data.

export function ReflectionCorrelationsSection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  const traderId = useAppStore((s) => s.user.userId);
  const reflections = useAppStore((s) => s.reflections);
  const tradeReflections = useAppStore((s) => s.tradeReflections);
  const sessionNotes = useAppStore((s) => s.sessionNotes);

  const summary = useMemo<ReflectionCorrelationSummary>(
    () =>
      computeReflectionCorrelations(
        {
          ...inputs,
          traderId,
          reflections,
          tradeReflections,
          sessionNotes,
        },
        timeframe,
        nowMs,
      ),
    [inputs, traderId, reflections, tradeReflections, sessionNotes, timeframe, nowMs],
  );

  const hasData = summary.reflectionSourceCount > 0;

  return (
    <section
      aria-label="Reflection correlations"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Reflection Correlations
        </span>
        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/60">
          {timeframe.label} · {summary.sectionConfidenceLabel}
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <MostFrequentCard summary={summary} />
          <DeteriorationLinkedCard summary={summary} />
          <AlignmentCard summary={summary} />
          <CleanSessionThemesCard summary={summary} />
          <RuleBreakThemesCard summary={summary} />
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur">
      <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand ring-1 ring-brand/30">
        <MessageSquareText className="size-4" />
      </span>
      <div className="flex flex-col gap-1 leading-tight">
        <span className="text-sm font-semibold text-foreground">
          No reflection correlations yet
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Correlations appear after saved reflections, trade notes, or
          journal entries are linked to behavior. Reflection language is
          treated as self-reported context — never a diagnosis.
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Card shells + presentational helpers
// -----------------------------------------------------------------------------

function CardShell({
  icon: Icon,
  title,
  caveat,
  children,
}: {
  icon: LucideIcon;
  title: string;
  caveat?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 p-5 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground ring-1 ring-white/10">
          <Icon className="size-3.5" />
        </span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
          {title}
        </span>
      </div>
      {children}
      {caveat ? (
        <span className="text-[0.65rem] leading-snug text-muted-foreground">
          {caveat}
        </span>
      ) : null}
    </div>
  );
}

function ThemeChip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground/80 ring-1 ring-white/10">
      {label}
    </span>
  );
}

function MostFrequentCard({
  summary,
}: {
  summary: ReflectionCorrelationSummary;
}) {
  const t = summary.mostFrequentTheme;
  return (
    <CardShell
      icon={Brain}
      title="Most Frequent Reflection Theme"
      caveat="Counts the language the trader used most often. Not a personality label — just a recurring word pattern."
    >
      {t ? (
        <>
          <span className="text-2xl font-semibold text-foreground">
            {t.label}
          </span>
          <span className="text-xs text-muted-foreground">
            Observed in {t.sessionsAffected} session
            {t.sessionsAffected === 1 ? "" : "s"} · {t.confidenceLabel}
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          No themes detected in this window yet.
        </span>
      )}
    </CardShell>
  );
}

function DeteriorationLinkedCard({
  summary,
}: {
  summary: ReflectionCorrelationSummary;
}) {
  const t = summary.themeMostLinkedToDeterioration;
  return (
    <CardShell
      icon={Waves}
      title="Theme Most Associated With Deterioration"
      caveat="Co-occurrence only — language appearing in sessions where deterioration was observed. Not a cause-and-effect claim."
    >
      {t ? (
        <>
          <span className="text-2xl font-semibold text-amber-300">
            {t.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {t.label} appeared in {t.sessionsAffected} session
            {t.sessionsAffected === 1 ? "" : "s"} where deterioration
            followed ({t.deteriorationRate}% co-occurrence).
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          No pressure themes observed alongside deterioration yet.
        </span>
      )}
    </CardShell>
  );
}

function AlignmentCard({
  summary,
}: {
  summary: ReflectionCorrelationSummary;
}) {
  const total =
    summary.alignmentRatio.aligned +
    summary.alignmentRatio.contradicted +
    summary.alignmentRatio.unclear;
  return (
    <CardShell
      icon={AlignLeft}
      title="Reflection / Behavior Alignment"
      caveat="Compares reflection language against observed events. Contradictions are flagged neutrally — not as honesty judgments."
    >
      {total > 0 ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-emerald-300">
              {summary.alignmentRatio.aligned}
            </span>
            <span className="text-xs text-muted-foreground">
              of {total} reflections aligned with observed behavior
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-emerald-300 ring-1 ring-emerald-500/30">
              {summary.alignmentRatio.aligned} aligned
            </span>
            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-rose-300 ring-1 ring-rose-500/30">
              {summary.alignmentRatio.contradicted} contradicted
            </span>
            <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-white/10">
              {summary.alignmentRatio.unclear} unclear
            </span>
          </div>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          No reflections in this window to compare against behavior yet.
        </span>
      )}
    </CardShell>
  );
}

function CleanSessionThemesCard({
  summary,
}: {
  summary: ReflectionCorrelationSummary;
}) {
  const themes = summary.themesLinkedToCleanSessions;
  return (
    <CardShell
      icon={ShieldCheck}
      title="Themes Linked to Clean Sessions"
      caveat="Words that appeared in sessions with no observed rule breaks. Co-occurrence; not a recommendation script."
    >
      {themes.length > 0 ? (
        <>
          <span className="text-xs leading-relaxed text-foreground/85">
            {summarizeThemeList(themes)} appeared in sessions that ended
            without observed rule breaks.
          </span>
          <div className="flex flex-wrap gap-1.5">
            {themes.map((t) => (
              <ThemeChip key={t.theme} label={t.label} />
            ))}
          </div>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          No clean-session themes detected yet.
        </span>
      )}
    </CardShell>
  );
}

function RuleBreakThemesCard({
  summary,
}: {
  summary: ReflectionCorrelationSummary;
}) {
  const themes = summary.themesLinkedToRuleBreaks;
  return (
    <CardShell
      icon={Waves}
      title="Themes Linked to Rule Breaks"
      caveat="Pressure-language that appeared in sessions with stop widening or warning overrides. Co-occurrence only."
    >
      {themes.length > 0 ? (
        <>
          <span className="text-xs leading-relaxed text-foreground/85">
            {summarizeThemeList(themes)} appeared in sessions with stop
            widening or warning overrides.
          </span>
          <div className="flex flex-wrap gap-1.5">
            {themes.map((t) => (
              <ThemeChip key={t.theme} label={t.label} />
            ))}
          </div>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          No rule-break-linked themes detected yet.
        </span>
      )}
    </CardShell>
  );
}

function summarizeThemeList(themes: ThemeCorrelation[]): string {
  if (themes.length === 0) return "";
  const labels = themes.map((t) => REFLECTION_THEME_LABEL[t.theme]);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}
