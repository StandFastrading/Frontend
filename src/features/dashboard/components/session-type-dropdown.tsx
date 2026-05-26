"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SessionType, TradingSession } from "@/types";
import { sessionDisplayLabel } from "@/types";
import { cn } from "@/lib/utils";

// Replaces the static "Session: Regular Hours" pill in the dashboard header.
// Reads the active session from the store, opens a real menu, and writes
// the chosen type back via `setSessionType` — without resetting metrics.
// Custom Session opens a small input prompt so the trader can name the
// session ("Earnings Day", "Fed Day", etc.).

type Props = {
  activeSession: TradingSession | null;
  onSelect: (type: SessionType, customLabel?: string | null) => void;
};

type Option = {
  type: SessionType;
  label: string;
};

const OPTIONS: Option[] = [
  { type: "premarket", label: "Premarket" },
  { type: "regular", label: "Regular Hours" },
  { type: "afterhours", label: "After Hours" },
  { type: "custom", label: "Custom Session" },
];

function formatStartedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionTypeDropdown({ activeSession, onSelect }: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState("");

  const label = activeSession
    ? sessionDisplayLabel(activeSession)
    : "No active session";
  const startedAt = activeSession
    ? formatStartedAt(activeSession.startedAt)
    : "—";
  const activeType = activeSession?.sessionType ?? null;

  const handleSelect = (option: Option) => {
    if (option.type === "custom") {
      // Pre-fill with whatever the trader had before so they can refine
      // an existing custom label without retyping.
      setCustomDraft(activeSession?.customLabel ?? "");
      setCustomOpen(true);
      return;
    }
    onSelect(option.type, null);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customDraft.trim();
    onSelect("custom", trimmed.length > 0 ? trimmed : null);
    setCustomOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!activeSession}
          className="flex items-center gap-3 rounded-lg border border-white/15 bg-card/60 px-3 py-2 backdrop-blur transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative size-2 rounded-full bg-emerald-400" />
          </span>
          <div className="flex flex-col leading-tight text-left">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foreground">
              Session: {label}
            </span>
            <span className="text-[0.65rem] text-muted-foreground">
              Started {startedAt}
            </span>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="min-w-[10rem]"
        >
          {OPTIONS.map((opt) => (
            <DropdownMenuItem
              key={opt.type}
              onClick={() => handleSelect(opt)}
              className={cn(
                "cursor-pointer text-sm",
                activeType === opt.type ? "font-semibold text-brand" : null,
              )}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent
          showCloseButton={false}
          className="dark flex max-w-md flex-col gap-5 border border-white/15 bg-card/95 p-5 text-foreground sm:max-w-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                Name this session
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Choose a label for the active session. Used in the dashboard
                header and on this session&rsquo;s archived records.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleCustomSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Session Label
              </Label>
              <Input
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                placeholder="Earnings Day"
                autoFocus
                maxLength={40}
              />
            </div>

            <div className="-mx-5 -mb-5 flex items-center justify-end gap-2 rounded-b-xl border-t border-white/10 bg-background/30 px-4 py-3">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
              >
                Save Label
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
