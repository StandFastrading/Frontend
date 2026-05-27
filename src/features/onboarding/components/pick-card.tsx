"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function PickCard({
  selected,
  onClick,
  className,
  children,
  variant = "single",
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  variant?: "single" | "multi";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/card relative flex rounded-xl border p-4 text-left",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-0.5",
        selected
          ? "border-cyan-400/70 bg-cyan-400/[0.10] shadow-[0_0_25px_-5px_rgba(34,211,238,0.45)]"
          : "border-white/[0.08] bg-[#0c1428]/80 hover:border-cyan-400/40 hover:bg-[#0e1730]/90 hover:shadow-[0_0_20px_-5px_rgba(34,211,238,0.25)]",
        className,
      )}
    >
      {selected ? (
        <div
          className={cn(
            "absolute right-2.5 top-2.5 flex size-5 items-center justify-center bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.55)]",
            variant === "multi" ? "rounded-[5px]" : "rounded-full",
          )}
        >
          <Check className="size-3 stroke-[3] text-cyan-950" />
        </div>
      ) : (
        variant === "multi" && (
          <div className="absolute right-2.5 top-2.5 size-5 rounded-[5px] border border-white/15" />
        )
      )}
      {children}
    </button>
  );
}
