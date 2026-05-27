"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Search, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CRYPTO_SETUP_LIBRARY,
  type LibrarySetupCategory,
} from "@/features/onboarding/crypto-setups-data";

export type CustomSetup = { id: string; label: string };

export function CryptoSetupLibrary({
  selected,
  onToggle,
  search,
  onSearch,
  customSetups,
  onAddCustomSetup,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
  customSetups: CustomSetup[];
  onAddCustomSetup: (label: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const searching = search.trim().length > 0;
  const term = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!searching) {
      return CRYPTO_SETUP_LIBRARY.map((cat) => ({
        ...cat,
        matches: cat.setups,
      }));
    }
    return CRYPTO_SETUP_LIBRARY.map((cat) => ({
      ...cat,
      matches: cat.setups.filter((s) =>
        s.label.toLowerCase().includes(term),
      ),
    })).filter((cat) => cat.matches.length > 0);
  }, [searching, term]);

  function toggleCategory(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-cyan-400/15 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search setups..."
          className="h-9 border-white/[0.08] bg-[#0c1428]/80 pl-8 text-sm text-white placeholder:text-slate-400 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#0c1428]/40 p-6 text-center">
          <p className="text-sm text-slate-300">
            No setups match{" "}
            <span className="font-semibold text-white">
              &ldquo;{search}&rdquo;
            </span>
            .
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Try a different search, or create a custom setup below.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((cat) => (
            <CategoryAccordion
              key={cat.id}
              category={cat}
              matches={cat.matches}
              totalCount={
                CRYPTO_SETUP_LIBRARY.find((c) => c.id === cat.id)?.setups
                  .length ?? 0
              }
              open={searching || expanded.has(cat.id)}
              onToggle={() => toggleCategory(cat.id)}
              selected={selected}
              onSelect={onToggle}
              searching={searching}
            />
          ))}
        </div>
      )}

      <HelperPanel
        customSetups={customSetups}
        selected={selected}
        onSelect={onToggle}
        onAddCustom={onAddCustomSetup}
      />
    </div>
  );
}

function CategoryAccordion({
  category,
  matches,
  totalCount,
  open,
  onToggle,
  selected,
  onSelect,
  searching,
}: {
  category: LibrarySetupCategory;
  matches: { id: string; label: string }[];
  totalCount: number;
  open: boolean;
  onToggle: () => void;
  selected: Set<string>;
  onSelect: (id: string) => void;
  searching: boolean;
}) {
  const selectedInCat = matches.filter((s) => selected.has(s.id)).length;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c1428]/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-cyan-400/[0.04]"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">
            {category.label}
          </span>
          <span className="text-[11px] text-slate-400">
            {searching
              ? `${matches.length} of ${totalCount} setups`
              : `${totalCount} setups`}
          </span>
          {selectedInCat > 0 && (
            <span className="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
              {selectedInCat} selected
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/[0.06] p-3 duration-200 animate-in fade-in slide-in-from-top-1">
          {matches.map((s) => (
            <SetupTag
              key={s.id}
              label={s.label}
              selected={selected.has(s.id)}
              onClick={() => onSelect(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SetupTag({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-200",
        selected
          ? "border-lime-400/70 bg-lime-400/[0.10] text-white shadow-[0_0_12px_-3px_rgba(163,230,53,0.45)]"
          : "border-white/[0.08] bg-[#0c1428]/80 text-slate-200 hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/[0.05] hover:text-white hover:shadow-[0_0_12px_-3px_rgba(34,211,238,0.35)]",
      )}
    >
      {selected && <Check className="size-3 stroke-[3] text-lime-400" />}
      {label}
    </button>
  );
}

function HelperPanel({
  customSetups,
  selected,
  onSelect,
  onAddCustom,
}: {
  customSetups: CustomSetup[];
  selected: Set<string>;
  onSelect: (id: string) => void;
  onAddCustom: (label: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  const canSave = draft.trim().length > 0;

  function handleSave() {
    const label = draft.trim();
    if (!label) return;
    onAddCustom(label);
    setDraft("");
  }

  function handleCancel() {
    setCreating(false);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.04] p-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.12] text-cyan-300">
            <Sparkles className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-white">
              Can&apos;t find your setup?
            </p>
            <p className="text-xs text-slate-300">
              Create and save your own custom setup.
            </p>
          </div>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/[0.10] px-3 text-sm font-semibold text-cyan-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan-400/[0.18] hover:shadow-[0_0_18px_-3px_rgba(34,211,238,0.5)]"
          >
            <Plus className="size-3.5" />
            Create Custom Setup
          </button>
        )}
      </div>

      {creating && (
        <div className="flex flex-col gap-2 rounded-lg border border-cyan-400/30 bg-[#08111f]/80 p-3 duration-200 animate-in fade-in slide-in-from-top-1">
          <label
            htmlFor="custom-crypto-setup-name"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400"
          >
            Name your setup
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="custom-crypto-setup-name"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === "Escape") {
                  handleCancel();
                }
              }}
              placeholder="e.g. SOL Funding Flip Long"
              className="h-9 flex-1 border-white/[0.08] bg-[#0c1428]/80 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={cn(
                  "flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-lime-950",
                  "bg-gradient-to-r from-lime-400 to-lime-500",
                  "shadow-[0_0_20px_-5px_rgba(132,204,22,0.5)]",
                  "transition-all duration-200 ease-out",
                  "hover:-translate-y-0.5 hover:from-lime-300 hover:to-lime-400",
                  "disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none",
                )}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-9 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0c1428]/80 px-3 text-sm text-slate-300 transition-colors hover:border-white/[0.15] hover:text-white"
              >
                Done
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Press <span className="font-semibold text-slate-300">Enter</span> to
            save · <span className="font-semibold text-slate-300">Esc</span> to
            close
          </p>
        </div>
      )}

      {customSetups.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Your custom setups
            </p>
            <p className="text-[11px] text-slate-500">
              {customSetups.length} created
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {customSetups.map((s) => (
              <SetupTag
                key={s.id}
                label={s.label}
                selected={selected.has(s.id)}
                onClick={() => onSelect(s.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
