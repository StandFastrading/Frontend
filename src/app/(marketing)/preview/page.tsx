import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, Play, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import {
  BEHAVIORS,
  BUILT_FOR_TRADERS,
  HERO_PILLS,
  HOW_IT_WORKS,
  VALUE_PROPS,
} from "@/features/marketing/data";
import { HeroFlow } from "@/features/marketing/components/hero-flow";
import { PatternIntelligenceCard } from "@/features/marketing/components/pattern-intelligence-card";
import { WaitlistTrigger } from "@/features/marketing/components/waitlist-trigger";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Standfast — Interrupt impulsive trading before execution",
  description:
    "Standfast is a real-time behavioral intervention system that helps day traders reduce self-sabotage and trade with discipline.",
};

export default function MarketingHomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,oklch(0.62_0.22_255/0.18),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-[60%] bg-[radial-gradient(circle_at_top_right,oklch(0.62_0.22_255/0.12),transparent_60%)]"
        />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_1.65fr] lg:py-28">
          <div className="flex flex-col gap-7">
            <h1 className="text-balance text-4xl font-bold uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Interrupt <span className="text-brand">impulsive trading</span>{" "}
              before execution.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Standfast is a real-time behavioral intervention system designed
              to reduce self-sabotage during live trading.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <WaitlistTrigger
                variant="beta"
                className="h-12 px-6 text-sm font-semibold uppercase tracking-wider"
              >
                <ShieldCheck className="size-4" />
                Request Beta Access
              </WaitlistTrigger>
              <WaitlistTrigger
                variant="launch"
                buttonVariant="outline"
                className="h-12 px-6 text-sm font-semibold uppercase tracking-wider"
              >
                <Play className="size-4" />
                Watch Demo
              </WaitlistTrigger>
            </div>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              {HERO_PILLS.map(({ label, icon: Icon }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="size-3.5 text-brand" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
          <HeroFlow />
        </div>
      </section>

      {/* ── Tagline strip ────────────────────────────────────────────── */}
      <section className="border-b border-border/60 py-10">
        <p className="mx-auto max-w-7xl px-6 text-center text-sm uppercase tracking-[0.25em] text-muted-foreground sm:text-base">
          For traders who want to win the{" "}
          <span className="text-brand">inner game</span>.
        </p>
      </section>

      {/* ── Problem / Behaviors ──────────────────────────────────────── */}
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-6">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-brand">
              The problem isn&rsquo;t strategy.
            </p>
            <h2 className="mt-3 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
              It&rsquo;s behavior.
            </h2>
          </div>
          <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-7">
            {BEHAVIORS.map(({ label, icon: Icon }) => (
              <li key={label} className="flex">
                <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-rose-500/40 bg-card/80 p-4 text-center backdrop-blur shadow-[0_0_28px_-12px_rgba(255,59,92,0.6)]">
                  <Icon
                    className="size-7 text-[#ff3b5c]"
                    strokeWidth={2.25}
                  />
                  <span className="text-xs font-semibold leading-tight text-foreground sm:text-sm">
                    {label}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="max-w-4xl text-balance text-center text-xl font-semibold uppercase leading-snug tracking-wide text-foreground/90 sm:text-2xl">
            These behaviors cost more than bad trades. They cost consistency,
            confidence, and compounding.
          </p>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="border-b border-border/60 py-20"
      >
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="flex flex-col gap-12 rounded-2xl border border-border/50 bg-card/30 px-6 py-12 backdrop-blur sm:px-10 sm:py-14">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-3xl font-bold uppercase tracking-tight sm:text-4xl">
                How Standfast Works
              </h2>
              <span
                aria-hidden
                className="h-0.5 w-12 rounded-full bg-brand"
              />
            </div>
            <ol className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
              {HOW_IT_WORKS.map((step, idx) => (
                <Step
                  key={step.title}
                  index={idx + 1}
                  title={step.title}
                  body={step.body}
                  Icon={step.icon}
                  isLast={idx === HOW_IT_WORKS.length - 1}
                />
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Built for traders + What type of trader ──────────────────── */}
      <section id="features" className="border-b border-border/60 py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 lg:grid-cols-2">
          <Card className="relative overflow-hidden border-border/60 bg-card/60 p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.62_0.22_255/0.12),transparent_60%)]"
            />
            <div className="relative flex flex-col gap-6">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-brand">
                  Built for traders.
                </p>
                <h3 className="mt-3 text-2xl font-bold uppercase tracking-tight sm:text-3xl">
                  Not trades.
                </h3>
              </div>
              <p className="max-w-md text-sm text-muted-foreground">
                Standfast is for traders who are serious about mastering their
                behavior, not just their strategy.
              </p>
              <ul className="flex flex-col gap-3">
                {BUILT_FOR_TRADERS.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex size-5 items-center justify-center rounded-full bg-brand/15 text-brand">
                      <Check className="size-3" />
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <PatternIntelligenceCard />
        </div>
      </section>

      {/* ── Closer + Join the Beta ───────────────────────────────────── */}
      <section className="border-b border-border/60 py-20">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 lg:grid-cols-2">
          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <span className="flex size-12 items-center justify-center rounded-full bg-brand/15 ring-1 ring-brand/30">
              <ShieldCheck className="size-6 text-brand" />
            </span>
            <h2 className="text-balance text-3xl font-bold uppercase tracking-tight sm:text-4xl">
              Sometimes the best trade is the one you{" "}
              <span className="text-brand">didn&rsquo;t take.</span>
            </h2>
          </div>
          <Card className="border-border/60 bg-card/60 p-8">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-brand">
                  Join the beta
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Be part of the first wave of traders building the future of
                  behavioral trading.
                </p>
              </div>
              <WaitlistTrigger
                variant="beta"
                className="h-11 self-start px-6 text-sm font-semibold uppercase tracking-wider"
              >
                <ShieldCheck className="size-4" />
                Request Beta Access
              </WaitlistTrigger>
            </div>
          </Card>
        </div>
      </section>

      {/* ── 4 value-props strip ─────────────────────────────────────── */}
      <section id="about" className="py-12">
        <ul className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ title, body, icon: Icon }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-brand/15 text-brand">
                <Icon className="size-4" />
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-xs text-muted-foreground">{body}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Subtle docs link in case visitors want depth */}
      <div className="mx-auto w-full max-w-7xl px-6 pb-16">
        <Link
          href={ROUTES.docs}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground hover:text-foreground",
          )}
        >
          Read the docs
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </main>
  );
}

type StepProps = {
  index: number;
  title: string;
  body: string;
  Icon: (typeof HOW_IT_WORKS)[number]["icon"];
  isLast: boolean;
};

function Step({ index, title, body, Icon, isLast }: StepProps) {
  return (
    <>
      <li className="flex flex-col items-center gap-4 text-center">
        <span className="relative flex size-20 items-center justify-center rounded-full bg-brand/10 ring-1 ring-brand/30">
          <Icon className="size-8 text-brand" />
        </span>
        <h3 className="text-sm font-bold uppercase tracking-wider">
          {index}. {title}
        </h3>
        <p className="max-w-xs text-sm font-medium text-brand">{body}</p>
      </li>
      {!isLast && (
        <span
          aria-hidden
          className="hidden items-center justify-center text-brand md:flex"
        >
          <ArrowRight className="size-6" />
        </span>
      )}
    </>
  );
}
