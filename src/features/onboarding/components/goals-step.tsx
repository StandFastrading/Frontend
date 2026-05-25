"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Brain,
  Clock,
  DollarSign,
  GraduationCap,
  Lightbulb,
  Search,
  Shield,
  Target,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Callout } from "./callout";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

type Goal = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const GOALS: Goal[] = [
  {
    id: "consistent-profits",
    label: "Consistent Profits",
    description: "Build steady, repeatable returns over time.",
    icon: Target,
  },
  {
    id: "protect-capital",
    label: "Protect Capital",
    description: "Minimize drawdowns and preserve capital.",
    icon: Shield,
  },
  {
    id: "grow-account",
    label: "Grow My Account",
    description: "Aggressively grow my portfolio.",
    icon: BarChart3,
  },
  {
    id: "create-income",
    label: "Create Income",
    description: "Generate consistent income from trading.",
    icon: DollarSign,
  },
  {
    id: "improve-discipline",
    label: "Improve Discipline",
    description: "Strengthen my mindset and trading habits.",
    icon: Brain,
  },
  {
    id: "sharpen-edge",
    label: "Sharpen My Edge",
    description: "Improve strategy and market analysis.",
    icon: Search,
  },
  {
    id: "time-freedom",
    label: "More Time Freedom",
    description: "Trade more efficiently and with flexibility.",
    icon: Clock,
  },
  {
    id: "learn-master",
    label: "Learn & Master",
    description: "Continuously improve my skills and knowledge.",
    icon: GraduationCap,
  },
];

const MAX_SELECTIONS = 3;

export function GoalsStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const valid = selected.size > 0;
  const atLimit = selected.size >= MAX_SELECTIONS;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= MAX_SELECTIONS) return;
      next.add(id);
    }
    setSelected(next);
  }

  function handleContinue() {
    console.log("[onboarding] goals", { selected: Array.from(selected) });
    router.push("/onboarding/setups");
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 4 of 9
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your top goals
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          What are you working toward? Select up to {MAX_SELECTIONS}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {GOALS.map((g) => {
          const Icon = g.icon;
          const isSelected = selected.has(g.id);
          const disabled = atLimit && !isSelected;
          return (
            <PickCard
              key={g.id}
              variant="multi"
              selected={isSelected}
              onClick={() => toggle(g.id)}
              className={cn(
                "flex-col items-center gap-3 px-4 py-6 text-center",
                disabled && "pointer-events-none opacity-40",
              )}
            >
              <Icon
                className={cn(
                  "size-9 transition-all duration-300",
                  isSelected
                    ? "text-lime-400 drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]"
                    : "text-lime-400/85",
                )}
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-white">{g.label}</p>
                <p className="text-xs leading-snug text-slate-300">
                  {g.description}
                </p>
              </div>
            </PickCard>
          );
        })}
      </div>

      <Callout
        icon={Lightbulb}
        title="We'll use this to personalize your experience."
        text="Your goals shape the insights, reminders, and recommendations you'll see inside your dashboard."
      />

      <StepFooter
        currentNum={4}
        onContinue={handleContinue}
        continueDisabled={!valid}
      />
    </div>
  );
}
