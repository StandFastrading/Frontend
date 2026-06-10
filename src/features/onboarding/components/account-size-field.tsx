"use client";

import { useState } from "react";

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Per-market onboarding account-size field.
//
// Unlike the base Stocks risk step, this starts BLANK and is never pre-filled
// with the stored default — the trader must make a deliberate entry so we don't
// silently persist 30,000 and corrupt dollar-risk math. `accountSize` is 0
// until a positive number is entered; callers gate "Continue" on it.
export function useAccountSizeField() {
  const [text, setText] = useState("");
  const accountSize = parseFloat(text.replace(/,/g, "")) || 0;
  return {
    accountSize,
    text,
    setText,
    // Pretty-print on blur once there's a real value; keep blank otherwise so
    // the placeholder + the required gate still apply.
    reformat: () => {
      if (accountSize > 0) setText(formatCurrency(accountSize));
    },
  };
}

export function AccountSizeField({
  label,
  hint,
  text,
  onChange,
  onBlur,
}: {
  label: string;
  hint?: string;
  text: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c1428]/80 px-3 transition-colors focus-within:border-cyan-400/60">
          <span className="text-sm text-slate-400">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder="e.g. 50,000"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
          />
          <span className="text-[11px] font-semibold tracking-wide text-slate-400">
            USD
          </span>
        </div>
        {hint ? (
          <p className="text-[11px] leading-snug text-slate-400">{hint}</p>
        ) : null}
      </div>
    </section>
  );
}
