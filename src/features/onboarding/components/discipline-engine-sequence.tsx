"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Brain,
  Puzzle,
  Shield,
  Target,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Discipline Engine Initialization Sequence — the onboarding completion
// cinematic. Plays a short, deliberate calibration that activates the five
// behavioral subsystems around the trader one at a time, then locks in
// with the official StandFast mark as the final system-online moment.
//
// Layered for future iteration:
//   - NODES               : config-only, drives both ordering and copy
//   - useEngineSequence() : timing-only state machine
//   - <CrossMark />       : the official mark, rendered inline so we can
//                           animate its reveal without juggling <img> states
//   - <NodeBadge />, <ConnectionLine />, <Core /> : visual primitives
//
// No new dependencies: choreography is React state + CSS transitions so
// the bundle stays small and the sequence is fully controllable.

type EngineNode = {
  id: string;
  // Activation order, 1-indexed. Matches the spec: Risk → Behavioral →
  // Execution → Improvement → Insights.
  order: number;
  // Position angle around the core (deg, 0 = top, clockwise).
  angle: number;
  title: string;
  subtitle: string;
  color: string;
  glow: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NODES: EngineNode[] = [
  {
    id: "risk",
    order: 1,
    angle: 0,
    title: "Risk Management",
    subtitle: "Protecting your capital",
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.55)",
    icon: Shield,
  },
  {
    id: "awareness",
    order: 2,
    angle: 72,
    title: "Behavioral Awareness",
    subtitle: "Monitoring triggers in real time",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.55)",
    icon: Brain,
  },
  {
    id: "execution",
    order: 3,
    angle: 144,
    title: "Focused Execution",
    subtitle: "Staying aligned with your plan",
    color: "#a3e635",
    glow: "rgba(163,230,53,0.55)",
    icon: Target,
  },
  {
    id: "improvement",
    order: 4,
    angle: 216,
    title: "Continuous Improvement",
    subtitle: "Adapting. Evolving. Getting better.",
    color: "#e879f9",
    glow: "rgba(232,121,249,0.55)",
    icon: Puzzle,
  },
  {
    id: "insights",
    order: 5,
    angle: 288,
    title: "Performance Insights",
    subtitle: "Turning data into clarity",
    color: "#fb923c",
    glow: "rgba(251,146,60,0.55)",
    icon: BarChart3,
  },
];

// Timing budget — total ≈ 6.4s, comfortably inside the 5–7s spec window.
// Each node beat is paced ~900ms so the calibration reads as deliberate
// rather than mechanical.
const INIT_DELAY_MS = 700;
const NODE_ACTIVATION_INTERVAL_MS = 900;
const POST_NODES_PAUSE_MS = 500;
const LOCK_REVEAL_MS = 900;

export type SequencePhase = "init" | "activating" | "pause" | "lock" | "online";

function useEngineSequence(): {
  phase: SequencePhase;
  activatedCount: number;
} {
  const [phase, setPhase] = useState<SequencePhase>("init");
  const [activatedCount, setActivatedCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const allOnAt = INIT_DELAY_MS + NODES.length * NODE_ACTIVATION_INTERVAL_MS;

    timers.push(setTimeout(() => setPhase("activating"), INIT_DELAY_MS));
    NODES.forEach((_, i) => {
      timers.push(
        setTimeout(
          () => setActivatedCount(i + 1),
          INIT_DELAY_MS + i * NODE_ACTIVATION_INTERVAL_MS,
        ),
      );
    });
    timers.push(setTimeout(() => setPhase("pause"), allOnAt));
    timers.push(
      setTimeout(() => setPhase("lock"), allOnAt + POST_NODES_PAUSE_MS),
    );
    timers.push(
      setTimeout(
        () => setPhase("online"),
        allOnAt + POST_NODES_PAUSE_MS + LOCK_REVEAL_MS,
      ),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return { phase, activatedCount };
}

export type DisciplineEngineSequenceProps = {
  // Fires once the sequence enters its terminal "online" state — the host
  // can use this to reveal post-reveal UI (the ready-items summary,
  // Enter Dashboard button, etc.) without polling.
  onOnline?: () => void;
};

export function DisciplineEngineSequence({
  onOnline,
}: DisciplineEngineSequenceProps) {
  const { phase, activatedCount } = useEngineSequence();
  const revealed = phase === "lock" || phase === "online";
  const online = phase === "online";

  useEffect(() => {
    if (online) onOnline?.();
  }, [online, onOnline]);

  return (
    <div className="flex flex-col items-center gap-6">
      <EngineDiagram
        activatedCount={activatedCount}
        revealed={revealed}
        online={online}
      />

      {/* Activation legend — appears below the diagram, fades each row in
          as its matching node lights up. Gives the user a visible ordinal
          progression that supplements the radial diagram. */}
      <NodeLegend activatedCount={activatedCount} />
    </div>
  );
}

function EngineDiagram({
  activatedCount,
  revealed,
  online,
}: {
  activatedCount: number;
  revealed: boolean;
  online: boolean;
}) {
  const radius = 130;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <svg
        className="absolute inset-0 size-full overflow-visible"
        viewBox="0 0 400 400"
        fill="none"
        aria-hidden
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
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient backdrop. The center glow intensifies as more nodes
            light up — see the inline style; this is the "system becoming
            more aware" cue. */}
        <circle
          cx="200"
          cy="200"
          r="190"
          fill="url(#engine-center-glow)"
          opacity={0.4 + activatedCount * 0.1}
          style={{ transition: "opacity 700ms ease-out" }}
        />

        {/* Outer + inner rings — slowly rotate and contract once the
            sequence locks in, giving the cinematic "system settling"
            beat. Rings stay subtle so they never compete with the mark. */}
        <g className="engine-ring-outer origin-center">
          <circle
            cx="200"
            cy="200"
            r="175"
            fill="none"
            stroke="rgba(34,211,238,0.10)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        </g>
        <circle
          cx="200"
          cy="200"
          r="148"
          fill="none"
          stroke="rgba(34,211,238,0.06)"
          strokeWidth="1"
        />
        <circle
          cx="200"
          cy="200"
          r="100"
          fill="none"
          stroke="rgba(34,211,238,0.08)"
          strokeWidth="1"
          opacity={revealed ? 0.6 : 1}
          style={{ transition: "opacity 700ms ease-out" }}
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
          const active = activatedCount >= node.order;
          return (
            <path
              key={node.id}
              d={`M 200 200 Q ${midX} ${midY} ${endX} ${endY}`}
              stroke={`url(#engine-grad-${node.id})`}
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              pathLength={1}
              style={{
                strokeDasharray: 1,
                strokeDashoffset: active ? 0 : 1,
                transition: "stroke-dashoffset 700ms ease-out",
              }}
            />
          );
        })}

        {NODES.map((node) => {
          const rad = ((node.angle - 90) * Math.PI) / 180;
          const endX = 200 + radius * Math.cos(rad);
          const endY = 200 + radius * Math.sin(rad);
          const active = activatedCount >= node.order;
          return (
            <g
              key={node.id}
              style={{
                opacity: active ? 1 : 0.15,
                transition: "opacity 600ms ease-out",
              }}
            >
              {/* Soft halo only present after activation. Bumped from
                  r=18 → r=20 (+11%) on this pass to keep the connection
                  point in proportion with the larger HTML node container
                  below. */}
              {active ? (
                <circle
                  cx={endX}
                  cy={endY}
                  r="20"
                  fill={node.color}
                  opacity="0.11"
                />
              ) : null}
              <circle
                cx={endX}
                cy={endY}
                r="10"
                fill={node.color}
                opacity={active ? 0.32 : 0.13}
              />
              <circle
                cx={endX}
                cy={endY}
                r="5"
                fill={node.color}
                style={{
                  filter: active
                    ? `drop-shadow(0 0 10px ${node.glow})`
                    : "none",
                }}
              />
              {/* Single-shot pulse painted on activation. `key` is tied to
                  the activated state so React remounts the circle the moment
                  the node lights up, restarting the ping animation. */}
              {active ? (
                <circle
                  key={`pulse-${node.id}-${activatedCount}`}
                  cx={endX}
                  cy={endY}
                  r="10"
                  fill="none"
                  stroke={node.color}
                  strokeWidth="1.75"
                  opacity="0.75"
                  className="engine-pulse"
                />
              ) : null}
            </g>
          );
        })}

        {/* Central core — quietly tightens once the sequence locks. */}
        <circle
          cx="200"
          cy="200"
          r={revealed ? 56 : 58}
          fill="rgba(8,17,31,0.85)"
          stroke="rgba(34,211,238,0.45)"
          strokeWidth="1.5"
          style={{ transition: "r 600ms ease-out" }}
        />
        <circle
          cx="200"
          cy="200"
          r={revealed ? 63 : 65}
          fill="none"
          stroke="rgba(34,211,238,0.18)"
          strokeWidth="1"
          style={{ transition: "r 600ms ease-out" }}
        />

        {/* Spiral calibration core — four concentric arcs counter-rotating
            inside the inner core. Brightens + tightens with each node
            activation, then quiets to an ambient backdrop once the mark
            locks in. Sits OVER the solid core fill so the mark (rendered
            via the HTML overlay below) reads on top of a soft halo. */}
        <SpiralCore activatedCount={activatedCount} revealed={revealed} />
      </svg>

      {/* Per-node label overlays. HTML rather than <foreignObject> so we
          can use the same Tailwind type/color scale as the rest of the app.
          Sized up from the original (size-9 / w-[150px] / text-[10px]) so
          the five subsystems read as active modules rather than tooltip
          dots — see the visual-hierarchy pass for the exact deltas. */}
      {NODES.map((node) => {
        const rad = ((node.angle - 90) * Math.PI) / 180;
        const xPct = 50 + Math.cos(rad) * 47;
        const yPct = 50 + Math.sin(rad) * 47;
        const Icon = node.icon;
        const active = activatedCount >= node.order;
        return (
          <div
            key={node.id}
            className="pointer-events-none absolute flex w-[180px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-center"
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
          >
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-xl border bg-[#08111f]/85 backdrop-blur transition-all duration-500 ease-out",
                active ? "scale-100 opacity-100" : "scale-90 opacity-30",
              )}
              style={{
                borderColor: `${node.color}${active ? "66" : "22"}`,
                boxShadow: active ? `0 0 24px -4px ${node.glow}` : "none",
                color: node.color,
              }}
            >
              <Icon
                className={cn(
                  "size-[22px] transition-[filter,opacity] duration-500",
                  active ? "opacity-100" : "opacity-40",
                )}
              />
            </div>
            <p
              className={cn(
                "text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-opacity duration-500",
                active ? "opacity-100" : "opacity-0",
              )}
              style={{ transitionDelay: active ? "150ms" : "0ms" }}
            >
              {node.title}
            </p>
            <p
              className={cn(
                "text-[10px] leading-tight text-slate-400 transition-opacity duration-500",
                active ? "opacity-100" : "opacity-0",
              )}
              style={{ transitionDelay: active ? "300ms" : "0ms" }}
            >
              {node.subtitle}
            </p>
          </div>
        );
      })}

      {/* Center mark + status. Kept on top of the diagram via absolute
          positioning so the mark sits inside the inner core ring. The
          supporting wordmark is intentionally minimal in V1 beta — just
          the ONLINE indicator under the mark so the lock-in moment reads
          as a single deliberate statement. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex w-[180px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
        <CrossMark revealed={revealed} />
        <div
          className={cn(
            "flex flex-col items-center gap-0.5 transition-opacity duration-700 ease-out",
            online ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-lime-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-lime-400" />
            </span>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-lime-400">
              Online
            </p>
          </div>
        </div>
      </div>

      {/* Component-scoped keyframes for the activation pulse, the slow
          outer-ring rotation, and the calibration spiral. Kept colocated
          so this diagram is self-contained — drop the file in, get the
          animation. The spiral arc rotations all use the same shared
          `transform-box: fill-box; transform-origin: center` setup so
          each `<circle>` rotates around its own (cx, cy). */}
      <style jsx>{`
        :global(.engine-pulse) {
          transform-box: fill-box;
          transform-origin: center;
          animation: engine-pulse 1100ms ease-out 1;
        }
        @keyframes engine-pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }
        :global(.engine-ring-outer) {
          transform-box: fill-box;
          transform-origin: center;
          will-change: transform;
          animation: engine-ring-spin 28s linear infinite;
        }
        @keyframes engine-ring-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        :global(.spiral-arc) {
          transform-box: fill-box;
          transform-origin: center;
          will-change: transform;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
        :global(.spiral-cw) {
          animation-name: spiral-spin-cw;
        }
        :global(.spiral-ccw) {
          animation-name: spiral-spin-ccw;
        }
        @keyframes spiral-spin-cw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spiral-spin-ccw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
      `}</style>
    </div>
  );
}

// Spiral calibration core. Four counter-rotating arcs, paced from a slow
// outer ring (22s) to a brisker inner ring (8s). Each arc is rendered as
// a dashed `<circle>` where the dash creates an open gap — rotation moves
// the gap around the orbit, producing the cinematic "calibration"
// impression without the spinner-y cheapness of a single rotating wedge.
//
// Reactivity:
//   - intensity rises with `activatedCount` → brighter strokes, slightly
//     thicker line, and a small radius contraction (the spiral
//     "tightens" as more subsystems lock in).
//   - On `revealed`, opacity drops to a quiet ambient so the StandFast
//     mark (rendered in the HTML overlay above) reads on top.
function SpiralCore({
  activatedCount,
  revealed,
}: {
  activatedCount: number;
  revealed: boolean;
}) {
  // 0 → 1 as the trader's nodes come online. Drives every brightness +
  // tightness response below.
  const intensity = Math.min(1, activatedCount / NODES.length);
  // Pulls each ring slightly inward as activations accumulate, so the
  // spiral visibly tightens around the eventual mark reveal.
  const contraction = activatedCount * 1.0;

  const ARCS = [
    { baseR: 46, duration: "22s", dir: "cw", baseOpacity: 0.28 },
    { baseR: 36, duration: "16s", dir: "ccw", baseOpacity: 0.36 },
    { baseR: 26, duration: "12s", dir: "cw", baseOpacity: 0.48 },
    { baseR: 16, duration: "8s", dir: "ccw", baseOpacity: 0.6 },
  ] as const;

  return (
    <g>
      {ARCS.map((arc, i) => {
        // Outer rings contract slightly less than inner so the spacing
        // feels engineered rather than uniformly squeezed.
        const r = arc.baseR - contraction * (0.5 + i * 0.15);
        const circ = 2 * Math.PI * r;
        const visibleFrac = 0.7;
        const liveOpacity = arc.baseOpacity + intensity * 0.25;
        return (
          <circle
            key={`spiral-${i}`}
            cx="200"
            cy="200"
            r={r}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={1 + intensity * 0.4}
            strokeLinecap="round"
            strokeDasharray={`${circ * visibleFrac} ${circ * (1 - visibleFrac)}`}
            opacity={revealed ? liveOpacity * 0.35 : liveOpacity}
            className={cn("spiral-arc", `spiral-${arc.dir}`)}
            style={{
              animationDuration: arc.duration,
              transition:
                "r 600ms ease-out, opacity 800ms ease-out, stroke-width 700ms ease-out",
            }}
          />
        );
      })}
    </g>
  );
}

// Inline rendering of the official StandFast mark — same gradients/colors
// as /public/logo/standfast-logo.svg, cropped to just the cross glyph
// (left fade bar + right solid bar + vertical bar). Rendering inline is
// what lets us animate the reveal cleanly: as a single SVG element we
// can opacity/scale + glow without `<img>` paint glitches.
function CrossMark({ revealed }: { revealed: boolean }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center transition-[opacity,transform,filter] duration-700 ease-out",
        revealed ? "scale-100 opacity-100" : "scale-90 opacity-0",
      )}
      style={{
        filter: revealed
          ? "drop-shadow(0 0 18px rgba(43,168,224,0.45))"
          : "drop-shadow(0 0 0px rgba(43,168,224,0))",
      }}
    >
      <svg
        viewBox="0 0 300 130"
        className="h-12 w-auto"
        role="img"
        aria-label="StandFast"
      >
        <defs>
          <linearGradient id="sf-mark-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#C8CCD0" stopOpacity="0" />
            <stop offset="0.45" stopColor="#C8CCD0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#D8DCE0" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="10" y="48" width="140" height="14" fill="url(#sf-mark-fade)" />
        <rect x="150" y="48" width="140" height="14" fill="#2BA8E0" />
        <rect x="142" y="10" width="16" height="110" fill="#2BA8E0" />
      </svg>
    </div>
  );
}

function NodeLegend({ activatedCount }: { activatedCount: number }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
      {NODES.map((node) => {
        const active = activatedCount >= node.order;
        return (
          <li
            key={node.id}
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors duration-500",
              active ? "text-white" : "text-slate-500",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors duration-500",
                active ? "" : "bg-slate-700",
              )}
              style={{ backgroundColor: active ? node.color : undefined }}
            />
            {node.title}
          </li>
        );
      })}
    </ol>
  );
}
