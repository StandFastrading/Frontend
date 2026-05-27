"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STEPS } from "@/features/onboarding/steps";
import { OPTIONS_STEPS } from "@/features/onboarding/options-steps";
import { FUTURES_STEPS } from "@/features/onboarding/futures-steps";
import { FOREX_STEPS } from "@/features/onboarding/forex-steps";
import { CRYPTO_STEPS } from "@/features/onboarding/crypto-steps";

export function StepFooter({
  currentNum,
  onContinue,
  continueDisabled,
  continueLabel = "Continue",
}: {
  currentNum: number;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
}) {
  const pathname = usePathname();
  const isOptionsFlow = pathname.startsWith("/onboarding/options/");
  const isFuturesFlow = pathname.startsWith("/onboarding/futures/");
  const isForexFlow = pathname.startsWith("/onboarding/forex/");
  const isCryptoFlow = pathname.startsWith("/onboarding/crypto/");
  const activeSteps = isOptionsFlow
    ? OPTIONS_STEPS
    : isFuturesFlow
      ? FUTURES_STEPS
      : isForexFlow
        ? FOREX_STEPS
        : isCryptoFlow
          ? CRYPTO_STEPS
          : STEPS;
  const prev = activeSteps.find((s) => s.num === currentNum - 1);
  const total = activeSteps.length;
  const completed = currentNum - 1;
  const progress = (completed / total) * 100;

  return (
    <div className="mt-12 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-32">
          {prev && (
            <Link href={`/onboarding/${prev.slug}`}>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:text-white"
              >
                <ArrowLeft className="size-4" />
                Previous
              </Button>
            </Link>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center gap-4">
          <span className="text-xs text-slate-300">
            {completed} of {total} steps completed
          </span>
          <div className="h-1.5 w-44 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button
            type="button"
            size="lg"
            onClick={onContinue}
            disabled={continueDisabled}
            className={cn(
              "h-12 gap-2 px-7 text-sm font-semibold tracking-wide text-lime-950",
              "bg-gradient-to-r from-lime-400 to-lime-500",
              "shadow-[0_0_30px_-5px_rgba(132,204,22,0.5)]",
              "transition-all duration-200 ease-out",
              "hover:-translate-y-0.5 hover:from-lime-300 hover:to-lime-400 hover:shadow-[0_0_45px_-5px_rgba(132,204,22,0.65)]",
              "disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none",
            )}
          >
            {continueLabel}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex justify-end">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Lock className="size-3" />
          Your data is private and secure
        </p>
      </div>
    </div>
  );
}
