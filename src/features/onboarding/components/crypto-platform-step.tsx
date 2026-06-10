"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bitcoin,
  Clock,
  Coins,
  Crown,
  Hexagon,
  LineChart,
  Lock,
  Plus,
  TrendingUp,
  Wallet,
  Waves,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PickCard } from "./pick-card";
import { StepFooter } from "./step-footer";

type Platform = {
  id: string;
  label: string;
  subLabel?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  logo?: string;
};

const PLATFORMS: Platform[] = [
  {
    id: "none",
    label: "Not connecting yet",
    description: "Exchange integrations are coming later.",
    icon: Clock,
  },
  {
    id: "binance",
    label: "Binance",
    description: "Spot, futures, and global liquidity.",
    icon: Coins,
    logo: "/logos/binance.svg",
  },
  {
    id: "coinbase",
    label: "Coinbase",
    description: "US-regulated spot and advanced trade.",
    icon: Bitcoin,
    logo: "/logos/coinbase.svg",
  },
  {
    id: "bybit",
    label: "Bybit",
    description: "Perps, options, and copy trading.",
    icon: TrendingUp,
    logo: "/logos/bybit.svg",
  },
  {
    id: "kraken",
    label: "Kraken",
    description: "Spot, margin, and pro tools.",
    icon: Waves,
    logo: "/logos/kraken.svg",
  },
  {
    id: "kucoin",
    label: "KuCoin",
    description: "Wide token coverage and futures.",
    icon: Crown,
    logo: "/logos/kucoin.svg",
  },
  {
    id: "okx",
    label: "OKX",
    description: "Spot, derivatives, and Web3 wallet.",
    icon: Hexagon,
    logo: "/logos/okx.svg",
  },
  {
    id: "hyperliquid",
    label: "Hyperliquid",
    description: "On-chain perps with deep liquidity.",
    icon: Activity,
    logo: "/logos/hyperliquid.svg",
  },
  {
    id: "tradingview",
    label: "TradingView",
    description: "Charting, ideas, and broker bridge.",
    icon: LineChart,
    logo: "/logos/tradingview.svg",
  },
  {
    id: "metamask",
    label: "MetaMask",
    description: "Self-custody wallet for DeFi tracking.",
    icon: Wallet,
    logo: "/logos/metamask.svg",
  },
  {
    id: "other-platform",
    label: "Other",
    description: "Can't find your platform? Choose custom.",
    icon: Plus,
  },
];

export function CryptoPlatformStep() {
  const router = useRouter();
  const [primary, setPrimary] = useState<string>("none");
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [customPlatformName, setCustomPlatformName] = useState("");

  const primaryIsOther = primary === "other-platform";

  // Optional step: continue is always allowed. Only require a name when the
  // tester has explicitly picked "Other" (otherwise the field is meaningless).
  const valid = !primaryIsOther || customPlatformName.trim() !== "";

  function toggleExtra(id: string) {
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleContinue() {
    console.log("[onboarding] crypto.platform", {
      primary,
      customPlatformName: primaryIsOther ? customPlatformName.trim() : null,
      extras: Array.from(extras),
    });
    router.push("/onboarding/complete");
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 7 of 7 · Optional
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Platform &amp; Exchange
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Future integration — optional for the beta. StandFast doesn&apos;t
          connect to your exchange yet, so nothing here links to your account.
          Tell us what you use if you like, or just continue.
        </p>
      </div>

      <NumberedSection num={1} title="Your primary platform (optional)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PLATFORMS.map((p) => {
            const isSelected = primary === p.id;
            return (
              <PickCard
                key={p.id}
                variant="single"
                selected={isSelected}
                onClick={() => setPrimary(p.id)}
                className="flex-col items-center gap-2 p-4 pr-4 pt-5 text-center"
              >
                <LogoIcon
                  src={p.logo}
                  alt={p.label}
                  fallback={p.icon}
                  selected={isSelected}
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-white">{p.label}</p>
                  {p.subLabel && (
                    <p className="text-[10px] text-slate-500">{p.subLabel}</p>
                  )}
                  <p className="text-[11px] leading-snug text-slate-300">
                    {p.description}
                  </p>
                </div>
              </PickCard>
            );
          })}
        </div>

        {primaryIsOther && (
          <OtherNameField
            label="What's your platform?"
            value={customPlatformName}
            onChange={setCustomPlatformName}
            placeholder="e.g. Phemex, Gate.io, Deribit..."
          />
        )}

        <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
          <Lock className="size-3" />
          Nothing connects to your account during the beta — this just records
          what you trade with.
        </p>
      </NumberedSection>

      <NumberedSection num={2} title="Additional exchanges (optional)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PLATFORMS.filter(
            (p) => p.id !== "other-platform" && p.id !== "none",
          ).map((p) => {
            const isSelected = extras.has(p.id);
            const isPrimary = primary === p.id;
            return (
              <PickCard
                key={`extra-${p.id}`}
                variant="multi"
                selected={isSelected}
                onClick={() => !isPrimary && toggleExtra(p.id)}
                className={cn(
                  "flex-col items-center gap-2 p-4 pr-9 pt-5 text-center",
                  isPrimary && "pointer-events-none opacity-40",
                )}
              >
                <LogoIcon
                  src={p.logo}
                  alt={p.label}
                  fallback={p.icon}
                  selected={isSelected}
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-white">{p.label}</p>
                  {isPrimary && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                      Primary
                    </p>
                  )}
                </div>
              </PickCard>
            );
          })}
        </div>

        <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
          <Clock className="size-3" />
          Exchange and wallet integrations are coming after the beta.
        </p>
      </NumberedSection>

      <StepFooter
        currentNum={7}
        onContinue={handleContinue}
        continueDisabled={!valid}
        continueLabel="Finalize Onboarding"
      />
    </div>
  );
}

function NumberedSection({
  num,
  title,
  headerRight,
  children,
}: {
  num: number;
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/50 text-xs font-semibold text-cyan-300">
            {num}
          </div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      {children}
    </section>
  );
}

function OtherNameField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/[0.04] p-3 duration-200 animate-in fade-in slide-in-from-top-1">
      <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
        {label}
      </label>
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 border-white/[0.08] bg-[#0c1428]/80 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30"
      />
    </div>
  );
}

function LogoIcon({
  src,
  alt,
  fallback: Fallback,
  selected,
}: {
  src?: string;
  alt: string;
  fallback: React.ComponentType<{ className?: string }>;
  selected: boolean;
}) {
  const [errored, setErrored] = useState(false);
  if (src && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        onError={() => setErrored(true)}
        className="size-7 object-contain"
      />
    );
  }
  return (
    <Fallback
      className={cn(
        "size-7 transition-all duration-300",
        selected
          ? "text-lime-400 drop-shadow-[0_0_6px_rgba(163,230,53,0.45)]"
          : "text-lime-400/85",
      )}
    />
  );
}
