"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Castle,
  Lightbulb,
  Star,
  Target,
  TrendingUp,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Callout } from "./callout";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

const YEARS = [
  { id: "lt1", label: "< 1 year" },
  { id: "1-2", label: "1 – 2 years" },
  { id: "2-3", label: "2 – 3 years" },
  { id: "5+", label: "5+ years" },
] as const;

const LEVELS = [
  {
    id: "new",
    label: "New Trader",
    description: "Still learning the basics",
    icon: Castle,
  },
  {
    id: "developing",
    label: "Developing",
    description: "Consistent in practice",
    icon: BarChart3,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Profitable at times, still inconsistent",
    icon: Target,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Consistently profitable",
    icon: Star,
  },
] as const;

type YearId = (typeof YEARS)[number]["id"];
type LevelId = (typeof LEVELS)[number]["id"];

export function ExperienceStep() {
  const router = useRouter();
  const [years, setYears] = useState<YearId | null>(null);
  const [level, setLevel] = useState<LevelId | null>(null);

  const valid = years !== null && level !== null;

  function handleContinue() {
    console.log("[onboarding] experience", { years, level });
    router.push("/onboarding/profile");
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 2 of 9
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your trading experience
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          This helps us customize insights to your level.
        </p>
      </div>

      <Section
        icon={TrendingUp}
        title="How many years of trading experience do you have?"
        subtitle="Be honest. There's no wrong answer."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {YEARS.map((y) => {
            const isSelected = years === y.id;
            return (
              <PickCard
                key={y.id}
                selected={isSelected}
                onClick={() => setYears(y.id)}
                className="items-center justify-center py-5 text-center"
              >
                <span
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isSelected ? "text-cyan-300" : "text-white",
                  )}
                >
                  {y.label}
                </span>
              </PickCard>
            );
          })}
        </div>
      </Section>

      <Section
        icon={User}
        title="What best describes your current experience?"
        subtitle="Choose the one that fits you most right now."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LEVELS.map((l) => {
            const Icon = l.icon;
            const isSelected = level === l.id;
            return (
              <PickCard
                key={l.id}
                selected={isSelected}
                onClick={() => setLevel(l.id)}
                className="flex-col items-start gap-2 p-4"
              >
                <Icon
                  className={cn(
                    "size-7 transition-all duration-300",
                    isSelected
                      ? "text-lime-400 drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]"
                      : "text-lime-400/85",
                  )}
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-white">{l.label}</p>
                  <p className="text-xs leading-snug text-slate-300">
                    {l.description}
                  </p>
                </div>
              </PickCard>
            );
          })}
        </div>
      </Section>

      <Callout
        icon={Lightbulb}
        title="StandFast meets you where you are."
        text="We'll help you build the habits and mindset that compound your edge."
      />

      <div className="mt-auto">
        <StepFooter
          currentNum={2}
          onContinue={handleContinue}
          continueDisabled={!valid}
        />
      </div>
    </div>
  );
}

type SectionProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

function Section({ icon: Icon, title, subtitle, children }: SectionProps) {
  return (
    <section className="grid grid-cols-1 gap-6 rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-6 lg:grid-cols-[1fr_2.2fr] lg:items-center lg:gap-8">
      <div className="flex items-start gap-3">
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
      <div>{children}</div>
    </section>
  );
}

