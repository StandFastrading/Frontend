"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function WelcomeStep() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");

  function handleContinue() {
    console.log("[onboarding] welcome", { fullName });
    router.push("/onboarding/market");
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-8">
      <Image
        src="/logo/standfast-logo.svg"
        alt="Standfast Technologies"
        width={280}
        height={80}
        priority
      />

      <div className="w-full rounded-2xl border border-cyan-500/15 bg-[#0c1326]/80 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
            Welcome to StandFast
          </h1>
          <p className="text-sm text-slate-400">
            Let&apos;s get to know you. We&apos;ll personalize everything from
            here.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleContinue();
          }}
          className="mt-7 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName" className="text-slate-300">
              Full name
            </Label>
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-11 border-cyan-500/20 bg-[#0a1020] text-base text-white placeholder:text-slate-600 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className={cn(
              "mt-2 h-12 w-full text-base font-semibold tracking-wide text-lime-950",
              "bg-gradient-to-r from-lime-400 to-lime-500",
              "shadow-[0_0_30px_-5px_rgba(132,204,22,0.5)]",
              "transition-all duration-200 ease-out",
              "hover:-translate-y-0.5 hover:from-lime-300 hover:to-lime-400 hover:shadow-[0_0_45px_-5px_rgba(132,204,22,0.65)]",
            )}
          >
            Continue
            <ArrowRight />
          </Button>
        </form>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Lock className="size-3" />
        Your data is private and secure
      </p>
    </div>
  );
}
