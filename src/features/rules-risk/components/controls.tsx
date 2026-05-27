"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Shared field/control primitives for the Rules & Risk page. Built locally
// so the visual language stays consistent with Trade Desk without leaking
// rules-risk-specific shapes into the global UI kit.

export function SectionCard({
  title,
  children,
  rightSlot,
  className,
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-xl border border-white/15 bg-card/60 p-5 backdrop-blur",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </span>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? (
        <span className="text-[0.65rem] text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

// Native <select> styling needs explicit colors on <option> — the dropdown
// popup is system-rendered and inherits white-on-white in dark mode otherwise.
export const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export const OPTION_STYLE: React.CSSProperties = {
  backgroundColor: "oklch(0.205 0 0)",
  color: "oklch(0.985 0 0)",
};

// Controlled numeric field that keeps a local text draft. Lets users fully
// clear the field while editing without forcing a "0" placeholder, strips
// leading zeros as they type, and commits a clean number on blur. Integer
// mode rejects decimal points outright.
type NumericInputProps = {
  value: number;
  onChange: (next: number) => void;
  allowDecimal?: boolean;
  placeholder?: string;
  className?: string;
};

function sanitizeNumeric(raw: string, allowDecimal: boolean): string {
  if (!allowDecimal) {
    return raw.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
  }
  let s = raw.replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  }
  // Strip leading zeros that aren't part of "0." (e.g. "02000" -> "2000",
  // but "0.5" stays).
  s = s.replace(/^0+(?=\d)/, "");
  return s;
}

function displayFromValue(value: number): string {
  return value === 0 ? "" : String(value);
}

export function NumericInput({
  value,
  onChange,
  allowDecimal = false,
  placeholder,
  className,
}: NumericInputProps) {
  const [draft, setDraft] = useState<string>(() => displayFromValue(value));
  const focusedRef = useRef(false);

  // External value changes (Reset, localStorage hydrate) should sync the
  // visible draft, but only when the user isn't actively typing.
  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(displayFromValue(value));
  }, [value]);

  return (
    <Input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={draft}
      placeholder={placeholder}
      className={className}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const next = sanitizeNumeric(e.target.value, allowDecimal);
        setDraft(next);
        if (next === "" || next === ".") {
          onChange(0);
          return;
        }
        const n = Number(next);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        focusedRef.current = false;
        if (draft === "" || draft === ".") {
          onChange(0);
          setDraft("");
          return;
        }
        const n = Number(draft);
        if (Number.isFinite(n)) {
          onChange(n);
          setDraft(displayFromValue(n));
        } else {
          onChange(0);
          setDraft("");
        }
      }}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-background/30 px-3 py-2.5 text-left transition-colors hover:border-white/20"
    >
      <div className="flex flex-col gap-0.5 leading-tight">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <span className="text-xs text-muted-foreground">{description}</span>
        ) : null}
      </div>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand" : "bg-foreground/15",
        )}
      >
        <span
          className={cn(
            "absolute inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
