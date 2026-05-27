"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SectionCard } from "@/features/rules-risk/components/controls";
import { cn } from "@/lib/utils";

// Canonical setup library. "Custom Setup" is intentionally listed last and
// branches into a text-input flow instead of being added directly.
const SETUP_LIBRARY = [
  "Opening Range Breakout",
  "VWAP Reclaim",
  "VWAP Bounce",
  "Bull Flag",
  "Bear Flag",
  "Pullback",
  "Breakout Continuation",
  "Breakdown Continuation",
  "Trend Reversal",
  "Mean Reversion",
  "Gap and Go",
  "Red to Green",
  "High of Day Break",
  "Low of Day Breakdown",
  "First Pullback",
  "Liquidity Sweep",
  "Support Bounce",
  "Resistance Rejection",
  "Supply Zone Rejection",
  "Demand Zone Bounce",
] as const;

const CUSTOM_SENTINEL = "Custom Setup";

export function AllowedSetupsSection({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Click-outside to close the dropdown / custom input.
  useEffect(() => {
    function handler(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const lowerQuery = query.toLowerCase().trim();
  const availableOptions = SETUP_LIBRARY.filter(
    (s) =>
      !value.includes(s) &&
      (lowerQuery === "" || s.toLowerCase().includes(lowerQuery)),
  );

  const addSetup = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  const removeSetup = (name: string) => {
    onChange(value.filter((s) => s !== name));
  };

  const handleSelect = (name: string) => {
    if (name === CUSTOM_SENTINEL) {
      setCustomMode(true);
      setOpen(false);
      setQuery("");
      return;
    }
    addSetup(name);
    setQuery("");
  };

  const commitCustom = () => {
    addSetup(customDraft);
    setCustomDraft("");
    setCustomMode(false);
  };

  const cancelCustom = () => {
    setCustomDraft("");
    setCustomMode(false);
  };

  return (
    <SectionCard title="Allowed Setup Types">
      <div className="flex flex-col gap-3">
        {/* Selected chips */}
        <div className="flex flex-wrap items-center gap-2">
          {value.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              No setups selected yet.
            </span>
          ) : (
            value.map((setup) => (
              <span
                key={setup}
                className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.08] py-1 pl-3 pr-1.5 text-xs font-medium text-brand"
              >
                {setup}
                <button
                  type="button"
                  onClick={() => removeSetup(setup)}
                  className="flex size-4 items-center justify-center rounded-full text-brand/70 transition-colors hover:bg-brand/15 hover:text-brand"
                  aria-label={`Remove ${setup}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Combobox / custom input */}
        <div ref={wrapperRef} className="relative">
          {customMode ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitCustom();
                  } else if (e.key === "Escape") {
                    cancelCustom();
                  }
                }}
                placeholder="Custom setup name…"
                className="h-9"
              />
              <button
                type="button"
                onClick={commitCustom}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
              >
                <Plus className="size-3.5" />
                Add
              </button>
              <button
                type="button"
                onClick={cancelCustom}
                className="flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onFocus={() => setOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                  }}
                  placeholder="Search or select a setup type…"
                  className="h-9 pl-8 pr-8"
                />
                <ChevronDown
                  className={cn(
                    "pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                />
              </div>

              {open ? (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/15 bg-card/95 p-1 shadow-xl backdrop-blur">
                  {availableOptions.length === 0 && lowerQuery !== "" ? (
                    <li className="px-3 py-2 text-xs text-muted-foreground">
                      No matching setups.
                    </li>
                  ) : (
                    availableOptions.map((name) => (
                      <li key={name}>
                        <button
                          type="button"
                          onClick={() => handleSelect(name)}
                          className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-foreground/5"
                        >
                          {name}
                        </button>
                      </li>
                    ))
                  )}
                  <li className="mt-1 border-t border-white/10 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelect(CUSTOM_SENTINEL)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/[0.08]"
                    >
                      <Plus className="size-3.5" />
                      {CUSTOM_SENTINEL}
                    </button>
                  </li>
                </ul>
              ) : null}
            </>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
