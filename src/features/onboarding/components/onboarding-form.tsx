"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

type OnboardingData = {
  fullName: string;
  phone: string;
  yearsTrading: string;
  primaryMarket: string;
  goal: string;
  riskPerTrade: string;
};

const MOCK_DATA: OnboardingData = {
  fullName: "Alex Morgan",
  phone: "+1 555 0134",
  yearsTrading: "3",
  primaryMarket: "Futures (ES, NQ)",
  goal: "Stay consistent and avoid revenge trades after a losing session.",
  riskPerTrade: "0.5",
};

const STEPS = ["Your profile", "Trading background", "Goals"] as const;

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(MOCK_DATA);
  const [submitting, setSubmitting] = useState(false);

  const isLast = step === STEPS.length - 1;

  function update<K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K],
  ) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    console.log("[onboarding] submit", data);
    toast.success("Onboarding submitted (mock)");
    router.push(ROUTES.dashboard);
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator current={step} />

      {step === 0 && <ProfileStep data={data} update={update} />}
      {step === 1 && <BackgroundStep data={data} update={update} />}
      {step === 2 && <GoalsStep data={data} update={update} />}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
        >
          Back
        </Button>
        {isLast ? (
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-1 flex-col gap-1.5">
          <div
            className={cn(
              "h-1 rounded-full",
              i <= current ? "bg-primary" : "bg-muted",
            )}
          />
          <span
            className={cn(
              "text-xs",
              i === current
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            Step {i + 1}. {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

type StepProps = {
  data: OnboardingData;
  update: <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K],
  ) => void;
};

function ProfileStep({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          autoComplete="name"
          value={data.fullName}
          onChange={(e) => update("fullName", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          value={data.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>
    </div>
  );
}

function BackgroundStep({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="yearsTrading">Years trading</Label>
        <Input
          id="yearsTrading"
          type="number"
          min={0}
          value={data.yearsTrading}
          onChange={(e) => update("yearsTrading", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="primaryMarket">Primary market</Label>
        <Input
          id="primaryMarket"
          value={data.primaryMarket}
          onChange={(e) => update("primaryMarket", e.target.value)}
        />
      </div>
    </div>
  );
}

function GoalsStep({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal">Top goal for this quarter</Label>
        <Input
          id="goal"
          value={data.goal}
          onChange={(e) => update("goal", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="riskPerTrade">Max risk per trade (% of account)</Label>
        <Input
          id="riskPerTrade"
          type="number"
          step="0.1"
          min={0}
          value={data.riskPerTrade}
          onChange={(e) => update("riskPerTrade", e.target.value)}
        />
      </div>
    </div>
  );
}
