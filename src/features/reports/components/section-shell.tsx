"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Compact section shell shared by every Reports section. Sets the
// kicker-style header, soft glass surface, and consistent padding so the
// page reads as a single coherent report rather than a stack of unrelated
// cards.

export function SectionShell({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 p-4 backdrop-blur",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground/[0.06] text-muted-foreground ring-1 ring-white/10">
          <Icon className="size-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            {eyebrow}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {title}
          </span>
          {description ? (
            <span className="text-xs text-muted-foreground">{description}</span>
          ) : null}
        </div>
        {action ? <div className="ml-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

// A single compact metric cell — labels, large numeric value, optional
// tone color, optional secondary line. Mirrors the Trade History summary
// row density so the page never grows giant cards.
export function MetricCell({
  label,
  value,
  secondary,
  tone,
  toneClass,
}: {
  label: string;
  value: string;
  secondary?: string;
  tone?: "emerald" | "rose" | "amber" | "muted";
  toneClass?: string;
}) {
  const cls =
    toneClass ??
    (tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
        ? "text-rose-300"
        : tone === "amber"
          ? "text-amber-300"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground");
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", cls)}>
        {value}
      </span>
      {secondary ? (
        <span className="text-[0.6rem] text-muted-foreground">
          {secondary}
        </span>
      ) : null}
    </div>
  );
}
