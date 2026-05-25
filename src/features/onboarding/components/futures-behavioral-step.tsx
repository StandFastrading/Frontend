"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  Coffee,
  Eye,
  Flame,
  Heart,
  Hourglass,
  MessageCircle,
  MoveHorizontal,
  Newspaper,
  Plus,
  Repeat,
  ShieldAlert,
  ShieldOff,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Waves,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Callout } from "./callout";
import { StepFooter } from "./step-footer";

type Behavior = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const BEHAVIORS: Behavior[] = [
  { id: "revenge-trading", label: "Revenge Trading", icon: Swords },
  { id: "overtrading", label: "Overtrading", icon: Repeat },
  { id: "moving-stops", label: "Moving Stops", icon: MoveHorizontal },
  { id: "oversizing", label: "Oversizing Contracts", icon: Flame },
  { id: "emotional-reentries", label: "Emotional Re-entries", icon: ArrowDownUp },
  { id: "trading-chop", label: "Trading Chop", icon: Waves },
  { id: "fomo-entries", label: "FOMO Entries", icon: Users },
  { id: "holding-losers", label: "Holding Losers Too Long", icon: Clock },
  { id: "impulsive-scalping", label: "Impulsive Scalping", icon: ArrowUp },
  { id: "breaking-daily-loss", label: "Breaking Daily Loss Rules", icon: ShieldOff },
  { id: "averaging-down", label: "Averaging Down", icon: ArrowDownUp },
  { id: "boredom-trading", label: "Trading Out of Boredom", icon: Coffee },
];

const TRIGGERS: Behavior[] = [
  { id: "red-days", label: "Red days", icon: ChevronDown },
  { id: "missed-moves", label: "Missed moves", icon: AlertTriangle },
  { id: "vol-spikes", label: "Volatility spikes", icon: ShieldAlert },
  { id: "news-events", label: "News events", icon: Newspaper },
  { id: "slow-markets", label: "Slow markets", icon: Hourglass },
  { id: "winning-streaks", label: "Winning streaks", icon: Trophy },
  { id: "lack-patience", label: "Lack of patience", icon: XCircle },
  { id: "fomo", label: "Fear of missing out", icon: Eye },
];

const INITIAL_VISIBLE_BEHAVIORS = 8;

type CustomBehavior = { id: string; label: string };

export function FuturesBehavioralStep() {
  const router = useRouter();
  const [behaviors, setBehaviors] = useState<Set<string>>(new Set());
  const [triggers, setTriggers] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [customBehaviors, setCustomBehaviors] = useState<CustomBehavior[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [showMore, setShowMore] = useState(false);

  const initial = BEHAVIORS.slice(0, INITIAL_VISIBLE_BEHAVIORS);
  const more = BEHAVIORS.slice(INITIAL_VISIBLE_BEHAVIORS);
  const hasHiddenSelected = more.some((b) => behaviors.has(b.id));
  const moreVisible = showMore || hasHiddenSelected;

  function toggle(
    set: Set<string>,
    id: string,
    setter: (s: Set<string>) => void,
  ) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function addCustomBehavior() {
    const label = draft.trim();
    if (!label) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomBehaviors((prev) => [...prev, { id, label }]);
    setBehaviors((prev) => new Set(prev).add(id));
    setDraft("");
  }

  function handleContinue() {
    console.log("[onboarding] futures.behavioral", {
      behaviors: Array.from(behaviors),
      triggers: Array.from(triggers),
      customBehaviors,
      notes,
    });
    router.push("/onboarding/futures/risk");
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 5 of 7
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Behavioral risk profile
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Help StandFast recognize the situations that affect your execution.
          There&apos;s no wrong answer here — just honesty.
        </p>
      </div>

      <Section
        icon={Heart}
        title="Patterns you want to watch"
        subtitle="Select the behaviors that show up for you. Awareness is the first protection."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {initial.map((b) => (
            <BehaviorCard
              key={b.id}
              icon={b.icon}
              label={b.label}
              selected={behaviors.has(b.id)}
              onClick={() => toggle(behaviors, b.id, setBehaviors)}
            />
          ))}
          {moreVisible &&
            more.map((b) => (
              <BehaviorCard
                key={b.id}
                icon={b.icon}
                label={b.label}
                selected={behaviors.has(b.id)}
                onClick={() => toggle(behaviors, b.id, setBehaviors)}
              />
            ))}
          {customBehaviors.map((b) => (
            <BehaviorCard
              key={b.id}
              icon={Plus}
              label={b.label}
              selected={behaviors.has(b.id)}
              onClick={() => toggle(behaviors, b.id, setBehaviors)}
            />
          ))}
        </div>

        {more.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMore(!moreVisible)}
            disabled={hasHiddenSelected && moreVisible}
            className={cn(
              "mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c1428]/40 px-3 py-2 text-xs font-semibold text-slate-300 transition-all duration-200",
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
                ? `${more.length} more behaviors shown`
                : "Show fewer"
              : `Show ${more.length} more behaviors`}
          </button>
        )}

        {creating ? (
          <div className="mt-3 flex gap-2 rounded-lg border border-cyan-400/30 bg-[#08111f]/80 p-2 duration-200 animate-in fade-in slide-in-from-top-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomBehavior();
                } else if (e.key === "Escape") {
                  setCreating(false);
                  setDraft("");
                }
              }}
              placeholder="e.g. Sizing up after winning streaks"
              className="h-8 flex-1 rounded-md border border-white/[0.08] bg-[#0c1428]/80 px-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
            <button
              type="button"
              onClick={addCustomBehavior}
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
            className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-cyan-400/30 bg-cyan-400/[0.03] px-3 py-2 text-xs font-semibold text-cyan-300 transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-400/[0.08]"
          >
            <Plus className="size-3.5" />
            Add custom behavior
          </button>
        )}
      </Section>

      <Section
        icon={AlertTriangle}
        title="What usually triggers poor decisions?"
        subtitle="Multi-select the situations that pull you off plan."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TRIGGERS.map((t) => (
            <BehaviorCard
              key={t.id}
              icon={t.icon}
              label={t.label}
              selected={triggers.has(t.id)}
              onClick={() => toggle(triggers, t.id, setTriggers)}
            />
          ))}
        </div>
      </Section>

      <Section
        icon={MessageCircle}
        title="Additional notes"
        subtitle="Anything else we should know? This is just for you."
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Example: I oversize on Fridays. I struggle to step away after a red FOMC..."
          rows={4}
          className="w-full resize-none rounded-lg border border-white/[0.08] bg-[#0c1428]/80 p-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30"
        />
      </Section>

      <Callout
        icon={Sparkles}
        title="This isn't a judgment — it's an alliance."
        text="StandFast uses what you share here to surface support exactly when you're most likely to need it. Update anytime."
      />

      <StepFooter
        currentNum={5}
        onContinue={handleContinue}
        continueDisabled={behaviors.size === 0}
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

function BehaviorCard({
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

