"use client";

import { useMemo } from "react";
import {
  Gauge,
  ShieldCheck,
  Sliders,
  type LucideIcon,
} from "lucide-react";

import { BEHAVIOR_EVENT_TYPES } from "@/lib/behavior-events";
import {
  ADAPTIVE_SEVERITY_LABEL,
  BEHAVIORAL_TRUST_LABEL,
  INTERVENTION_RESPONSE_LABEL,
  computeAdaptiveInterventionProfile,
  type AdaptiveInterventionProfile,
  type AdaptiveSeverityLevel,
  type BehavioralTrustLevel,
  type InterventionResponseQuality,
} from "@/lib/analytics/adaptive-intervention-engine";
import { useTimeframe } from "@/lib/analytics/timeframe";
import { useAnalyticsInputs } from "@/features/analytics/use-analytics-inputs";
import {
  useCurrentSessionEvents,
  useCurrentSessionInterventions,
} from "@/lib/sessions/session-helpers";
import { useAppStore } from "@/store";
import { useSessionIntelligence } from "@/store/slices/session-intelligence-slice";
import { cn } from "@/lib/utils";

// SECTION — Adaptive Intervention
//
// Three lightweight cards that surface the current calibration of the
// rule-check system to the trader's behavior. Driven by the centralized
// adaptive-intervention-engine; this component only renders.

const TRUST_TONE: Record<
  BehavioralTrustLevel,
  { ring: string; text: string }
> = {
  stable: {
    ring: "border-emerald-500/30 bg-emerald-500/[0.05]",
    text: "text-emerald-300",
  },
  caution: {
    ring: "border-amber-500/30 bg-amber-500/[0.05]",
    text: "text-amber-300",
  },
  high_pressure: {
    ring: "border-rose-500/30 bg-rose-500/[0.06]",
    text: "text-rose-300",
  },
  critical: {
    ring: "border-rose-500/50 bg-rose-500/[0.09]",
    text: "text-rose-200",
  },
};

const SEVERITY_TONE: Record<
  AdaptiveSeverityLevel,
  { ring: string; text: string }
> = {
  passive: TRUST_TONE.stable,
  standard: TRUST_TONE.stable,
  elevated: TRUST_TONE.caution,
  high_pressure: TRUST_TONE.high_pressure,
  critical: TRUST_TONE.critical,
};

const RESPONSE_TONE: Record<
  InterventionResponseQuality,
  { ring: string; text: string }
> = {
  improving: TRUST_TONE.stable,
  stable: {
    ring: "border-white/10 bg-card/40",
    text: "text-foreground/85",
  },
  deteriorating: TRUST_TONE.high_pressure,
  insufficient: {
    ring: "border-white/10 bg-card/30",
    text: "text-muted-foreground",
  },
};

export function AdaptiveInterventionSection() {
  const { timeframe } = useTimeframe();
  const { inputs, nowMs } = useAnalyticsInputs();
  const traderId = useAppStore((s) => s.user.userId);
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const sessionMetrics = useAppStore((s) => s.session);
  const intel = useSessionIntelligence();
  const sessionEvents = useCurrentSessionEvents();
  const sessionInterventions = useCurrentSessionInterventions();

  const liveSessionState = useMemo(
    () => ({
      sessionId: activeSessionId,
      disciplineScore: intel.disciplineScore,
      // The session-intelligence sessionState vocab marks active escalation
      // explicitly; map both "elevated" and "high-risk" to the engine's
      // boolean. Lockout uses the canonical session-metrics flag.
      escalationDetected:
        intel.sessionState === "elevated" ||
        intel.sessionState === "high-risk",
      overtradingDetected: intel.overtradingSignals > 0,
      lockoutActive: sessionMetrics.dailyLossLimitBreached,
      consecutiveLosses: sessionMetrics.consecutiveLosses,
      warningOverridesThisSession: sessionEvents.filter(
        (e) =>
          e.eventType === BEHAVIOR_EVENT_TYPES.WARNING_IGNORED ||
          e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_OVERRIDE_ACCEPTED,
      ).length,
      stopWideningsThisSession: sessionEvents.filter(
        (e) => e.eventType === BEHAVIOR_EVENT_TYPES.STOP_MOVED_FURTHER,
      ).length,
      interventionsThisSession: sessionInterventions.length,
    }),
    [activeSessionId, intel, sessionMetrics, sessionEvents, sessionInterventions],
  );

  const profile = useMemo<AdaptiveInterventionProfile>(
    () =>
      computeAdaptiveInterventionProfile(
        { ...inputs, traderId, liveSessionState },
        timeframe,
        nowMs,
      ),
    [inputs, traderId, liveSessionState, timeframe, nowMs],
  );

  return (
    <section
      aria-label="Adaptive intervention"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3 pl-1">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Adaptive Intervention
        </span>
        <span className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/60">
          {timeframe.label} · {profile.evidenceConfidenceLabel}
        </span>
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TrustLevelCard profile={profile} />
        <SensitivityCard profile={profile} />
        <ResponseQualityCard profile={profile} />
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Cards
// -----------------------------------------------------------------------------

function CardShell({
  icon: Icon,
  title,
  caveat,
  ringClass,
  children,
}: {
  icon: LucideIcon;
  title: string;
  caveat?: string;
  ringClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 p-5 backdrop-blur",
        ringClass,
      )}
    >
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

function TrustLevelCard({
  profile,
}: {
  profile: AdaptiveInterventionProfile;
}) {
  const tone = TRUST_TONE[profile.trust];
  return (
    <CardShell
      icon={ShieldCheck}
      title="Behavioral Trust Level"
      caveat="Calibrated from recorded events only. Not a personality label."
      ringClass={tone.ring}
    >
      <span className={cn("text-2xl font-semibold", tone.text)}>
        {BEHAVIORAL_TRUST_LABEL[profile.trust]}
      </span>
      <span className="text-xs leading-relaxed text-foreground/80">
        {profile.explanation}
      </span>
    </CardShell>
  );
}

function SensitivityCard({
  profile,
}: {
  profile: AdaptiveInterventionProfile;
}) {
  const tone = SEVERITY_TONE[profile.level];
  return (
    <CardShell
      icon={Sliders}
      title="Intervention Sensitivity"
      caveat="Friction is earned. Disciplined sessions get fewer interruptions; recurring pressure raises the threshold for Continue Anyway."
      ringClass={tone.ring}
    >
      <span className={cn("text-2xl font-semibold", tone.text)}>
        {ADAPTIVE_SEVERITY_LABEL[profile.level]}
      </span>
      <span className="text-xs leading-relaxed text-foreground/80">
        {profile.friction.description}
      </span>
      <div className="flex flex-wrap items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.14em]">
        <Chip label={`Pause ${profile.friction.pauseSeconds}s`} />
        {profile.friction.requireExplicitAcknowledgement ? (
          <Chip label="Acknowledge" />
        ) : null}
        {profile.friction.showReflectionPrompt ? (
          <Chip label="Reflection prompt" />
        ) : null}
        {profile.fatigue.fatigueActive ? (
          <Chip label="Repeats suppressed" />
        ) : null}
      </div>
    </CardShell>
  );
}

function ResponseQualityCard({
  profile,
}: {
  profile: AdaptiveInterventionProfile;
}) {
  const tone = RESPONSE_TONE[profile.responseQuality];
  return (
    <CardShell
      icon={Gauge}
      title="Intervention Response Quality"
      caveat="Mix of cancels, revisions, and the consequence rate of overrides — no profit math."
      ringClass={tone.ring}
    >
      <span className={cn("text-2xl font-semibold", tone.text)}>
        {INTERVENTION_RESPONSE_LABEL[profile.responseQuality]}
      </span>
      <span className="text-xs leading-relaxed text-foreground/80">
        {profile.fatigue.description}
      </span>
    </CardShell>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-foreground/80 ring-1 ring-white/10">
      {label}
    </span>
  );
}
