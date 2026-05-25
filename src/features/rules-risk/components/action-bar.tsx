"use client";

import { RotateCcw, Save } from "lucide-react";

export function ActionBar({
  dirty,
  onSave,
  onReset,
}: {
  dirty: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/15 bg-card/60 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-muted-foreground">
        {dirty ? "You have unsaved changes." : "All changes saved."}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-4" />
          Reset to Defaults
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="size-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
