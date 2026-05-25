"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Lightbulb,
  Sparkles,
  Star,
  Target,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Callout } from "./callout";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

const LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Learning contracts, strikes, and expiration behavior.",
    icon: BookOpen,
  },
  {
    id: "developing",
    label: "Developing",
    description: "Understand basic strategies but still inconsistent.",
    icon: Sparkles,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Comfortable with directional options trading.",
    icon: Target,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Actively manage risk, spreads, and multi-leg positions.",
    icon: Star,
  },
] as const;

const TENURES = [
  { id: "lt6", label: "< 6 months" },
  { id: "6-12", label: "6 – 12 months" },
  { id: "1-3", label: "1 – 3 years" },
  { id: "3plus", label: "3+ years" },
] as const;

type LevelId = (typeof LEVELS)[number]["id"];
type TenureId = (typeof TENURES)[number]["id"];

export function OptionsExperienceStep() {
  const router = useRouter();
  const [level, setLevel] = useState<LevelId | null>(null);
  const [tenure, setTenure] = useState<TenureId | null>(null);

  const valid = level !== null && tenure !== null;

  function handleContinue() {
    console.log("[onboarding] options.experience", { level, tenure });
    router.push("/onboarding/options/profile");
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 2 of 6
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your options experience
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Help StandFast understand how you trade options so we can tailor your
          behavioral protections.
        </p>
      </div>

      <Section
        icon={GraduationCap}
        title="What best describes your experience?"
        subtitle="Pick the one that fits you most right now."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LEVELS.map((l) => {
            const Icon = l.icon;
            const isSelected = level === l.id;
            return (
              <PickCard
                key={l.id}
                variant="single"
                selected={isSelected}
                onClick={() => setLevel(l.id)}
                className="flex-col items-start gap-2 p-4 pr-9"
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

      <Section
        icon={User}
        title="How long have you traded options?"
        subtitle="Be honest. We use this to calibrate the depth of our guidance."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TENURES.map((t) => {
            const isSelected = tenure === t.id;
            return (
              <PickCard
                key={t.id}
                variant="single"
                selected={isSelected}
                onClick={() => setTenure(t.id)}
                className="items-center justify-center py-5 text-center"
              >
                <span
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isSelected ? "text-cyan-300" : "text-white",
                  )}
                >
                  {t.label}
                </span>
              </PickCard>
            );
          })}
        </div>
      </Section>

      <Callout
        icon={Lightbulb}
        title="Leverage demands precision."
        text="Options magnify both edges and mistakes. StandFast will adjust intervention strength to where you are."
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

