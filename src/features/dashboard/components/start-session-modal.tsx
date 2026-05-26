"use client";

import { PlayCircle, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Confirmation modal for the "Start New Session" action. Closes any active
// session, opens a fresh one, and resets live counters — but every piece
// of historical data (closed trades, behavior events, rules) is preserved.
// The body copy makes that explicit so the trader isn't worried about
// losing journaled work.

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onConfirm: () => void;
};

export function StartSessionModal({ open, onOpenChange, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="dark flex max-w-md flex-col gap-5 border border-white/15 bg-card/95 p-5 text-foreground sm:max-w-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
                "bg-brand/15 text-brand ring-brand/30",
              )}
            >
              <PlayCircle className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                Start a new trading session?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This will close the current active session and begin a fresh
                session. Historical trades and behavior logs will remain saved.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="rounded-lg border border-white/10 bg-background/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Use this for a new trading block, market session, or next-day reset.
        </p>

        <div className="-mx-5 -mb-5 flex items-center justify-end gap-2 rounded-b-xl border-t border-white/10 bg-background/30 px-4 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            <PlayCircle className="size-4" />
            Start New Session
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
