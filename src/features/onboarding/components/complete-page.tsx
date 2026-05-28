"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  Link2,
  Shield,
  ShieldCheck,
  Target,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import {
  setMockOnboarded,
  setMockSession,
} from "@/features/auth/mock-session";
import { DisciplineEngineSequence } from "@/features/onboarding/components/discipline-engine-sequence";
import { cn } from "@/lib/utils";

// Onboarding completion experience. The cinematic Discipline Engine
// sequence is the page — it dominates the viewport while the system
// "calibrates" around the trader and reveals the official StandFast
// mark as the final lock-in moment. Only after the sequence reports
// `online` does the supporting summary + Enter Dashboard CTA fade in
// below it.

const READY_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Risk framework loaded",
    text: "Your rules and limits are now active.",
  },
  {
    icon: User,
    title: "Trading profile calibrated",
    text: "We understand your style and environment.",
  },
  {
    icon: Brain,
    title: "Behavioral triggers mapped",
    text: "We'll help you recognize and manage them.",
  },
  {
    icon: Target,
    title: "Setup engine configured",
    text: "Your strategy and setups are locked in.",
  },
  {
    icon: Link2,
    title: "Platform integrations connected",
    text: "Your data will power deeper insights.",
  },
];

export function CompletePage() {
  const router = useRouter();
  const [systemOnline, setSystemOnline] = useState(false);

  const handleEnterDashboard = () => {
    // Set both flags before navigating — handles the case where a user
    // reaches /onboarding without an active session (otherwise middleware
    // sees no session cookie on /dashboard and redirects to /auth).
    setMockSession();
    setMockOnboarded();
    router.push(ROUTES.dashboard);
    router.refresh();
  };

  // Stable callback so the sequence's reveal effect (whose deps include
  // this prop) doesn't tear down + re-attach on every CompletePage render.
  const handleOnline = useCallback(() => setSystemOnline(true), []);

  return (
    <div className="relative flex flex-1 flex-col items-center px-6 py-10">
      {/* Hero — the cinematic calibration sequence. Keeps a generous
          vertical envelope so the lock-in moment lands as a full-attention
          event, then collapses into the summary stack below. Sits on top
          of the very faint BackgroundMark, which makes the whole sequence
          feel built INSIDE the StandFast framework rather than presented
          against an empty backdrop. */}
      <section className="relative flex w-full max-w-3xl flex-col items-center gap-6 pb-10">
        <BackgroundMark />
        {/* Hero content sits in its own stacking context so the absolutely
            positioned BackgroundMark stays behind it without resorting to
            negative z-indexes that could escape the page wrapper. */}
        <div className="relative z-10 flex w-full flex-col items-center gap-6">
          <header className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Step 9 of 9 · Calibration
            </p>
            <h1 className="font-heading text-3xl font-bold leading-[1.05] tracking-tight text-white sm:text-4xl">
              Building Your Discipline Engine
              <span className="text-lime-400">.</span>
            </h1>
          </header>

          <DisciplineEngineSequence onOnline={handleOnline} />
        </div>
      </section>

      {/* Post-reveal summary. Hidden until the sequence reports online,
          then fades + slides up so it feels like the page itself is
          settling into its resting state. `pointer-events-none` while
          hidden prevents accidental focus on the CTA before reveal. */}
      <section
        aria-hidden={!systemOnline}
        className={cn(
          "w-full max-w-3xl transition-all duration-700 ease-out",
          systemOnline
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-400">
              System Online
            </p>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Your System Is Ready
            </h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-300">
              StandFast has calibrated itself around you and is ready to go
              to work.
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {READY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#0a1122]/60 p-3"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-lime-400" />
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Icon className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="text-[11px] leading-snug text-slate-300">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-1 self-center border-l-2 border-lime-400/60 pl-4">
            <p className="text-base font-semibold text-white">
              The goal isn&apos;t more trades.
            </p>
            <p className="text-base font-semibold text-lime-400">
              It&apos;s better decisions.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.03] p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.12] text-cyan-300">
                <ShieldCheck className="size-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-white">
                  StandFast does not execute trades for you.
                </p>
                <p className="text-xs leading-relaxed text-cyan-300">
                  It helps you execute with intention.
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleEnterDashboard}
              className={cn(
                "h-14 w-full gap-2 text-base font-semibold tracking-wide text-lime-950",
                "bg-gradient-to-r from-lime-400 to-lime-500",
                "shadow-[0_0_40px_-5px_rgba(132,204,22,0.55)]",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-0.5 hover:from-lime-300 hover:to-lime-400 hover:shadow-[0_0_55px_-5px_rgba(132,204,22,0.7)]",
              )}
            >
              Enter Dashboard
              <ArrowRight className="size-5" />
            </Button>
          </div>

          <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Shield className="size-3" />
            You&apos;re in control. StandFast is here to help you{" "}
            <span className="text-cyan-300">stay that way.</span>
          </p>
        </div>
      </section>

      {systemOnline ? <ScrollPrompt /> : null}
    </div>
  );
}

// Massive faint StandFast mark anchored behind the calibration sequence.
// Renders the official cross glyph (same gradients/colors as the canonical
// /public/logo/standfast-logo.svg) at very low opacity with a slow
// ambient breathe + drop-shadow pulse — communicates "this system is
// being constructed inside the StandFast framework" without ever
// competing with the foreground animation. The inline SVG keeps the
// breathing animation cleanly composable with the parent layout.
function BackgroundMark() {
  // Two stacked layers, each animating ONLY opacity:
  //   1. The mark itself with a single static drop-shadow filter — no
  //      filter animation, just compositor-cheap opacity breathing.
  //   2. A sibling radial-gradient halo whose opacity oscillates on a
  //      separate timer to simulate the glow swell without recomputing
  //      a 100px-radius drop-shadow on a 1200px-wide element every frame.
  //
  // Pre-perf-pass this used to animate `filter: drop-shadow` from 50px
  // to 110px radius on the mark itself, which was forcing the browser
  // to repaint a huge translucent region 60×/sec. Splitting glow into a
  // separate breathing div keeps the same visual feel at a fraction of
  // the cost.
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="sf-bg-halo absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(43,168,224,0.12) 0%, rgba(43,168,224,0.04) 38%, transparent 72%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 300 130"
          className="sf-bg-mark h-auto w-[140%] max-w-[1200px]"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label=""
        >
          <defs>
            <linearGradient id="sf-bg-mark-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#C8CCD0" stopOpacity="0" />
              <stop offset="0.45" stopColor="#C8CCD0" stopOpacity="0.55" />
              <stop offset="1" stopColor="#D8DCE0" stopOpacity="1" />
            </linearGradient>
          </defs>
          <rect
            x="10"
            y="48"
            width="140"
            height="14"
            fill="url(#sf-bg-mark-fade)"
          />
          <rect x="150" y="48" width="140" height="14" fill="#2BA8E0" />
          <rect x="142" y="10" width="16" height="110" fill="#2BA8E0" />
        </svg>
      </div>
      <style jsx>{`
        :global(.sf-bg-mark) {
          /* Static glow — applied once, never animated. */
          opacity: 0.12;
          filter: drop-shadow(0 0 40px rgba(43, 168, 224, 0.08));
          will-change: opacity;
          animation: sf-bg-mark-breathe 22s ease-in-out infinite;
        }
        @keyframes sf-bg-mark-breathe {
          0%,
          100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.15;
          }
        }
        :global(.sf-bg-halo) {
          opacity: 0.7;
          will-change: opacity;
          animation: sf-bg-halo-breathe 22s ease-in-out infinite;
        }
        @keyframes sf-bg-halo-breathe {
          0%,
          100% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// Temporary static scroll cue — pure rollback after the animated spine
// version caused page-load regressions. Renders only once the calibration
// sequence reports online (gated by the parent). No animation, no
// keyframes, no filters, no animated shadows. A polished animated
// version will be reintroduced later once the perf root cause is fully
// understood.
function ScrollPrompt() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-8 right-8 z-30 flex flex-col items-center gap-1 text-lime-300 sm:bottom-10 sm:right-10"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.28em]">
        Enter Dashboard
      </span>
      <ChevronDown className="size-6" />
    </div>
  );
}
