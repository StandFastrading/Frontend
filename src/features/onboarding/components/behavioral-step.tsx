"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  Clock,
  Crown,
  DollarSign,
  Eye,
  Frown,
  Gauge,
  HelpCircle,
  Hourglass,
  Lightbulb,
  MoreHorizontal,
  Newspaper,
  Plus,
  RefreshCw,
  Repeat,
  RotateCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
  ShieldOff,
  Smartphone,
  Swords,
  Target,
  TriangleAlert,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Callout } from "./callout";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

type Option = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const MINDSETS: Option[] = [
  { id: "analytical", label: "Analytical", description: "I rely on data, logic, and analysis.", icon: BarChart3 },
  { id: "disciplined", label: "Disciplined", description: "I follow my plan and stay consistent.", icon: Target },
  { id: "adaptive", label: "Adaptive", description: "I adjust quickly as markets change.", icon: RefreshCw },
  { id: "patient", label: "Patient", description: "I wait for high-probability opportunities.", icon: Hourglass },
  { id: "aggressive", label: "Aggressive", description: "I like action and seize opportunities.", icon: Zap },
  { id: "other-mindset", label: "Other", description: "Something else describes me better.", icon: MoreHorizontal },
];

const RISK_LEVELS: Option[] = [
  { id: "very-conservative", label: "Very Conservative", description: "Protect capital above all else.", icon: ShieldCheck },
  { id: "conservative", label: "Conservative", description: "Low risk, steady growth.", icon: Shield },
  { id: "balanced", label: "Balanced", description: "Balance risk and reward.", icon: ShieldHalf },
  { id: "aggressive-risk", label: "Aggressive", description: "Higher risk for higher rewards.", icon: ShieldAlert },
  { id: "very-aggressive", label: "Very Aggressive", description: "Maximum opportunity focus.", icon: ShieldOff },
];

const TRIGGERS: Option[] = [
  { id: "losing-streaks", label: "Losing streaks", icon: TriangleAlert },
  { id: "big-wins", label: "Big wins", icon: Trophy },
  { id: "fomo", label: "Missing out (FOMO)", icon: Users },
  { id: "overtrading", label: "Overtrading", icon: RotateCw },
  { id: "revenge-trading", label: "Revenge trading", icon: Swords },
  { id: "impatience", label: "Impatience", icon: Clock },
  { id: "market-volatility", label: "Market volatility", icon: Activity },
  { id: "giving-back", label: "Giving back profits", icon: DollarSign },
  { id: "news-catalysts", label: "News / catalysts", icon: Newspaper },
  { id: "choppy-markets", label: "Choppy / sideways markets", icon: Repeat },
  { id: "uncertainty", label: "Uncertainty", icon: HelpCircle },
  { id: "drawdowns", label: "Drawdowns", icon: BarChart3 },
  { id: "pressure-perform", label: "Pressure to perform", icon: Gauge },
  { id: "fear-missing", label: "Fear of missing profitable trades", icon: Eye },
  { id: "overconfidence", label: "Overconfidence", icon: Crown },
  { id: "boredom", label: "Boredom", icon: Frown },
  { id: "distraction", label: "Distraction", icon: Smartphone },
  { id: "other-trigger", label: "Other", icon: MoreHorizontal },
];

const INITIAL_VISIBLE_TRIGGERS = 6;

type CustomTrigger = { id: string; label: string };

export function BehavioralStep() {
  const router = useRouter();
  const [mindset, setMindset] = useState<string | null>(null);
  const [risk, setRisk] = useState<string | null>(null);
  const [triggers, setTriggers] = useState<Set<string>>(new Set());
  const [customTriggers, setCustomTriggers] = useState<CustomTrigger[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [showMore, setShowMore] = useState(false);

  const valid = mindset !== null && risk !== null;

  const initialTriggers = TRIGGERS.slice(0, INITIAL_VISIBLE_TRIGGERS);
  const moreTriggers = TRIGGERS.slice(INITIAL_VISIBLE_TRIGGERS);
  const hasHiddenSelected = moreTriggers.some((t) => triggers.has(t.id));
  const moreVisible = showMore || hasHiddenSelected;

  function toggleTrigger(id: string) {
    setTriggers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCustomTrigger() {
    const label = draft.trim();
    if (!label) return;
    const id = `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomTriggers((prev) => [...prev, { id, label }]);
    setTriggers((prev) => new Set(prev).add(id));
    setDraft("");
  }

  function handleContinue() {
    console.log("[onboarding] behavioral", {
      mindset,
      risk,
      triggers: Array.from(triggers),
      customTriggers,
    });
    router.push("/onboarding/risk");
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 6 of 9
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Behavioral check-in
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Self-awareness is an edge. Help us understand how you think and react
          so we can support you better.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Section
            icon={Brain}
            title="Mindset & Strengths"
            subtitle="What describes you best?"
          >
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {MINDSETS.map((m) => {
                const Icon = m.icon;
                const isSelected = mindset === m.id;
                return (
                  <PickCard
                    key={m.id}
                    variant="single"
                    selected={isSelected}
                    onClick={() => setMindset(m.id)}
                    className="flex-col items-start gap-2 p-3.5 pr-9"
                  >
                    <Icon
                      className={cn(
                        "size-6 transition-all duration-300",
                        isSelected
                          ? "text-lime-400 drop-shadow-[0_0_6px_rgba(163,230,53,0.45)]"
                          : "text-lime-400/85",
                      )}
                    />
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold text-white">
                        {m.label}
                      </p>
                      <p className="text-[11px] leading-snug text-slate-300">
                        {m.description}
                      </p>
                    </div>
                  </PickCard>
                );
              })}
            </div>
          </Section>

          <Section
            icon={Shield}
            title="Risk Tolerance"
            subtitle="How do you typically approach risk?"
          >
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {RISK_LEVELS.map((r) => {
                const Icon = r.icon;
                const isSelected = risk === r.id;
                return (
                  <PickCard
                    key={r.id}
                    variant="single"
                    selected={isSelected}
                    onClick={() => setRisk(r.id)}
                    className="flex-col items-center gap-2 p-3 pr-3 text-center"
                  >
                    <Icon
                      className={cn(
                        "size-6 transition-all duration-300",
                        isSelected
                          ? "text-lime-400 drop-shadow-[0_0_6px_rgba(163,230,53,0.45)]"
                          : "text-lime-400/85",
                      )}
                    />
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[11px] font-semibold text-white">
                        {r.label}
                      </p>
                      <p className="text-[10px] leading-snug text-slate-300">
                        {r.description}
                      </p>
                    </div>
                  </PickCard>
                );
              })}
            </div>
          </Section>
        </div>

        <Section
          icon={TriangleAlert}
          title="Emotional Triggers"
          subtitle="What situations challenge you the most? Select all that apply."
        >
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {initialTriggers.map((t) => (
                <TriggerCard
                  key={t.id}
                  icon={t.icon}
                  label={t.label}
                  selected={triggers.has(t.id)}
                  onClick={() => toggleTrigger(t.id)}
                />
              ))}
              {moreVisible &&
                moreTriggers.map((t) => (
                  <TriggerCard
                    key={t.id}
                    icon={t.icon}
                    label={t.label}
                    selected={triggers.has(t.id)}
                    onClick={() => toggleTrigger(t.id)}
                  />
                ))}
              {customTriggers.map((t) => (
                <TriggerCard
                  key={t.id}
                  icon={Plus}
                  label={t.label}
                  selected={triggers.has(t.id)}
                  onClick={() => toggleTrigger(t.id)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMore(!moreVisible)}
              disabled={hasHiddenSelected && moreVisible}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c1428]/40 px-3 py-2 text-xs font-semibold text-slate-300 transition-all duration-200",
                "hover:border-cyan-400/40 hover:bg-cyan-400/[0.04] hover:text-cyan-300",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/[0.08] disabled:hover:bg-[#0c1428]/40 disabled:hover:text-slate-300",
              )}
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  moreVisible && "rotate-180",
                )}
              />
              {moreVisible
                ? hasHiddenSelected
                  ? `${moreTriggers.length} more triggers shown`
                  : "Show fewer triggers"
                : `Show ${moreTriggers.length} more triggers`}
            </button>

            {creating ? (
              <div className="flex gap-2 rounded-lg border border-cyan-400/30 bg-[#08111f]/80 p-2 duration-200 animate-in fade-in slide-in-from-top-1">
                <Input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTrigger();
                    } else if (e.key === "Escape") {
                      setCreating(false);
                      setDraft("");
                    }
                  }}
                  placeholder="e.g. Trading near key earnings"
                  className="h-8 flex-1 border-white/[0.08] bg-[#0c1428]/80 text-xs text-white placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30"
                />
                <button
                  type="button"
                  onClick={addCustomTrigger}
                  disabled={!draft.trim()}
                  className={cn(
                    "flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold text-lime-950",
                    "bg-gradient-to-r from-lime-400 to-lime-500",
                    "shadow-[0_0_15px_-3px_rgba(132,204,22,0.45)]",
                    "transition-all duration-200 ease-out",
                    "hover:-translate-y-0.5 hover:from-lime-300 hover:to-lime-400",
                    "disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none",
                  )}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setDraft("");
                  }}
                  className="flex h-8 items-center justify-center rounded-md border border-white/[0.08] bg-[#0c1428]/80 px-2.5 text-xs text-slate-300 transition-colors hover:border-white/[0.15] hover:text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-cyan-400/30 bg-cyan-400/[0.03] px-3 py-2 text-xs font-semibold text-cyan-300 transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-400/[0.08]"
              >
                <Plus className="size-3.5" />
                Add custom trigger
              </button>
            )}
          </div>
        </Section>
      </div>

      <Callout
        icon={Lightbulb}
        title="Your answers personalize your dashboard, notifications, and interventions."
        text="You can update these at any time in your profile settings."
      />

      <StepFooter
        currentNum={6}
        onContinue={handleContinue}
        continueDisabled={!valid}
      />
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.10] text-cyan-300">
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold leading-snug text-white">
            {title}
          </h2>
          <p className="text-xs leading-snug text-slate-300">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TriggerCard({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-all duration-200",
        selected
          ? "border-cyan-400/70 bg-cyan-400/[0.10] shadow-[0_0_14px_-3px_rgba(34,211,238,0.45)]"
          : "border-white/[0.08] bg-[#0c1428]/80 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/[0.04] hover:shadow-[0_0_12px_-3px_rgba(34,211,238,0.3)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          className={cn(
            "size-4 shrink-0 transition-colors",
            selected
              ? "text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.4)]"
              : "text-lime-400/85",
          )}
        />
        <span className="text-xs font-medium leading-snug text-white">
          {label}
        </span>
      </div>
      {selected ? (
        <div className="flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]">
          <Check className="size-2.5 stroke-[3] text-cyan-950" />
        </div>
      ) : (
        <div className="size-4 shrink-0 rounded-[4px] border border-white/15" />
      )}
    </button>
  );
}
