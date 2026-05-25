"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Link2,
  Puzzle,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

type EngineNode = {
  id: string;
  angle: number;
  color: string;
  glow: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NODES: EngineNode[] = [
  {
    id: "awareness",
    angle: 0,
    color: "#a855f7",
    glow: "rgba(168,85,247,0.55)",
    title: "BEHAVIORAL AWARENESS",
    subtitle: "Monitoring triggers in real time",
    icon: Brain,
  },
  {
    id: "execution",
    angle: 72,
    color: "#a3e635",
    glow: "rgba(163,230,53,0.55)",
    title: "FOCUSED EXECUTION",
    subtitle: "Staying aligned with your plan",
    icon: Target,
  },
  {
    id: "improvement",
    angle: 144,
    color: "#e879f9",
    glow: "rgba(232,121,249,0.55)",
    title: "CONTINUOUS IMPROVEMENT",
    subtitle: "Adapting. Evolving. Getting better.",
    icon: Puzzle,
  },
  {
    id: "insights",
    angle: 216,
    color: "#fb923c",
    glow: "rgba(251,146,60,0.55)",
    title: "PERFORMANCE INSIGHTS",
    subtitle: "Turning data into clarity",
    icon: BarChart3,
  },
  {
    id: "risk",
    angle: 288,
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.55)",
    title: "RISK MANAGEMENT",
    subtitle: "Protecting your capital",
    icon: Shield,
  },
];

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
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-6 lg:order-1">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Step 9 of 9 · Complete
            </p>
            <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Your System
              <br />
              Is Ready
              <span className="text-lime-400">.</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-300">
              Your behavioral framework has been configured and StandFast is
              ready to go to work for you.
            </p>
          </div>

          <ul className="flex flex-col gap-2.5">
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

          <div className="flex flex-col gap-1 border-l-2 border-lime-400/60 pl-4">
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
            <Link href={ROUTES.dashboard}>
              <Button
                size="lg"
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
            </Link>
          </div>

          <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Shield className="size-3" />
            You&apos;re in control. StandFast is here to help you{" "}
            <span className="text-cyan-300">stay that way.</span>
          </p>
        </div>

        <div className="order-0 lg:order-2">
          <DisciplineEngineDiagram />
        </div>
      </div>
    </div>
  );
}

function DisciplineEngineDiagram() {
  const radius = 130;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[480px]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: i % 5 === 0 ? "2px" : "1px",
              height: i % 5 === 0 ? "2px" : "1px",
              opacity: 0.15 + ((i * 7) % 30) / 100,
              filter:
                i % 7 === 0
                  ? "drop-shadow(0 0 3px rgba(255,255,255,0.5))"
                  : undefined,
            }}
          />
        ))}
      </div>

      <svg
        className="absolute inset-0 size-full overflow-visible"
        viewBox="0 0 400 400"
        fill="none"
      >
        <defs>
          {NODES.map((node) => (
            <linearGradient
              key={node.id}
              id={`engine-grad-${node.id}`}
              x1="50%"
              y1="50%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
              <stop offset="100%" stopColor={node.color} stopOpacity="0.9" />
            </linearGradient>
          ))}
          <radialGradient id="engine-center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="200" cy="200" r="190" fill="url(#engine-center-glow)" />
        <circle
          cx="200"
          cy="200"
          r="175"
          fill="none"
          stroke="rgba(34,211,238,0.10)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
        <circle
          cx="200"
          cy="200"
          r="100"
          fill="none"
          stroke="rgba(34,211,238,0.08)"
          strokeWidth="1"
        />

        {NODES.map((node) => {
          const rad = ((node.angle - 90) * Math.PI) / 180;
          const endX = 200 + radius * Math.cos(rad);
          const endY = 200 + radius * Math.sin(rad);
          const dx = endX - 200;
          const dy = endY - 200;
          const perpX = -dy * 0.18;
          const perpY = dx * 0.18;
          const midX = (200 + endX) / 2 + perpX;
          const midY = (200 + endY) / 2 + perpY;
          return (
            <path
              key={node.id}
              d={`M 200 200 Q ${midX} ${midY} ${endX} ${endY}`}
              stroke={`url(#engine-grad-${node.id})`}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          );
        })}

        {NODES.map((node) => {
          const rad = ((node.angle - 90) * Math.PI) / 180;
          const endX = 200 + radius * Math.cos(rad);
          const endY = 200 + radius * Math.sin(rad);
          return (
            <g key={node.id}>
              <circle
                cx={endX}
                cy={endY}
                r="14"
                fill={node.color}
                opacity="0.12"
              />
              <circle
                cx={endX}
                cy={endY}
                r="7"
                fill={node.color}
                opacity="0.25"
              />
              <circle
                cx={endX}
                cy={endY}
                r="3.5"
                fill={node.color}
                style={{ filter: `drop-shadow(0 0 4px ${node.glow})` }}
              />
            </g>
          );
        })}

        <circle
          cx="200"
          cy="200"
          r="58"
          fill="rgba(8,17,31,0.85)"
          stroke="rgba(34,211,238,0.45)"
          strokeWidth="1.5"
        />
        <circle
          cx="200"
          cy="200"
          r="65"
          fill="none"
          stroke="rgba(34,211,238,0.18)"
          strokeWidth="1"
        />
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
        <Image
          src="/standfast-logo.svg"
          alt=""
          width={36}
          height={36}
          className="size-9"
          priority
        />
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white">
          Discipline Engine
        </p>
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-lime-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-lime-400" />
          </span>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-lime-400">
            Online
          </p>
        </div>
      </div>

      {NODES.map((node) => {
        const rad = ((node.angle - 90) * Math.PI) / 180;
        const xPct = 50 + Math.cos(rad) * 47;
        const yPct = 50 + Math.sin(rad) * 47;
        const Icon = node.icon;
        return (
          <div
            key={node.id}
            className="pointer-events-none absolute flex w-[130px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center"
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
          >
            <div
              className="flex size-8 items-center justify-center rounded-lg border bg-[#08111f]/80 backdrop-blur"
              style={{
                borderColor: `${node.color}55`,
                boxShadow: `0 0 12px -3px ${node.glow}`,
              }}
            >
              <Icon className="size-4" style={{ color: node.color }} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white">
              {node.title}
            </p>
            <p className="text-[9px] leading-tight text-slate-400">
              {node.subtitle}
            </p>
          </div>
        );
      })}

      <Sparkles
        className="absolute right-2 top-2 size-3 text-cyan-300/60"
        aria-hidden
      />
      <Sparkles
        className="absolute bottom-4 left-2 size-2 text-lime-400/50"
        aria-hidden
      />
    </div>
  );
}
