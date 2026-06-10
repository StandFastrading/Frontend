"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  Clock,
  Globe,
  Landmark,
  Layers,
  LineChart,
  Lock,
  Plus,
  TrendingUp,
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
    description: "Platform integrations are coming later.",
    icon: Clock,
  },
  {
    id: "mt4",
    label: "MetaTrader 4",
    description: "The classic forex workhorse.",
    icon: Activity,
    logo: "/logos/metatrader-4.svg",
  },
  {
    id: "mt5",
    label: "MetaTrader 5",
    description: "Modern multi-asset MetaQuotes platform.",
    icon: Layers,
    logo: "/logos/metatrader-5.svg",
  },
  {
    id: "tradingview",
    label: "TradingView",
    description: "Charting, ideas, and execution.",
    icon: LineChart,
    logo: "/logos/tradingview.svg",
  },
  {
    id: "ctrader",
    label: "cTrader",
    description: "ECN-focused platform for FX.",
    icon: TrendingUp,
    logo: "/logos/ctrader.svg",
  },
  {
    id: "ninjatrader",
    label: "NinjaTrader",
    description: "Advanced charting and automation.",
    icon: Layers,
    logo: "/logos/ninjatrader.svg",
  },
  {
    id: "thinkorswim",
    label: "thinkorswim",
    subLabel: "by Charles Schwab",
    description: "Powerful tools and advanced charting.",
    icon: BarChart3,
    logo: "/logos/thinkorswim.svg",
  },
  {
    id: "other-platform",
    label: "Other",
    description: "Can't find your platform? Choose custom.",
    icon: Plus,
  },
];

type Broker = {
  id: string;
  label: string;
  markets: string;
  icon: React.ComponentType<{ className?: string }>;
  logo?: string;
};

const BROKERS: Broker[] = [
  {
    id: "none",
    label: "Not using a broker yet",
    markets: "Broker integrations are coming later.",
    icon: Clock,
  },
  {
    id: "oanda",
    label: "OANDA",
    markets: "Forex, CFDs",
    icon: Globe,
    logo: "/logos/oanda.svg",
  },
  {
    id: "forex-com",
    label: "Forex.com",
    markets: "Forex, CFDs, Crypto",
    icon: Landmark,
    logo: "/logos/forex-com.svg",
  },
  {
    id: "ibkr",
    label: "Interactive Brokers",
    markets: "Multi-asset global broker",
    icon: Building2,
    logo: "/logos/interactive-brokers.svg",
  },
  {
    id: "ig",
    label: "IG",
    markets: "Forex, CFDs, Spread Betting",
    icon: LineChart,
    logo: "/logos/ig.svg",
  },
  {
    id: "pepperstone",
    label: "Pepperstone",
    markets: "Forex, CFDs",
    icon: Activity,
    logo: "/logos/pepperstone.svg",
  },
  {
    id: "icmarkets",
    label: "IC Markets",
    markets: "Forex, CFDs (true ECN)",
    icon: TrendingUp,
    logo: "/logos/ic-markets.svg",
  },
  {
    id: "other-broker",
    label: "Other Broker",
    markets: "Custom connection",
    icon: Plus,
  },
];

export function ForexPlatformStep() {
  const router = useRouter();
  const [platform, setPlatform] = useState<string>("none");
  const [broker, setBroker] = useState<string>("none");
  const [customPlatformName, setCustomPlatformName] = useState("");
  const [customBrokerName, setCustomBrokerName] = useState("");

  const platformIsOther = platform === "other-platform";
  const brokerIsOther = broker === "other-broker";

  // Optional step: continue is always allowed. Only require a name when the
  // tester has explicitly picked "Other" (otherwise the field is meaningless).
  const valid =
    (!platformIsOther || customPlatformName.trim() !== "") &&
    (!brokerIsOther || customBrokerName.trim() !== "");

  function handleContinue() {
    console.log("[onboarding] forex.platform", {
      platform,
      customPlatformName: platformIsOther ? customPlatformName.trim() : null,
      broker,
      customBrokerName: brokerIsOther ? customBrokerName.trim() : null,
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
          Platform &amp; Broker
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Future integration — optional for the beta. StandFast doesn&apos;t
          connect to your broker or platform yet, so nothing here links to your
          account. Tell us what you use if you like, or just continue.
        </p>
      </div>

      <NumberedSection num={1} title="Your primary platform (optional)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PLATFORMS.map((p) => {
            const isSelected = platform === p.id;
            return (
              <PickCard
                key={p.id}
                variant="single"
                selected={isSelected}
                onClick={() => setPlatform(p.id)}
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

        {platformIsOther && (
          <OtherNameField
            label="What's your platform?"
            value={customPlatformName}
            onChange={setCustomPlatformName}
            placeholder="e.g. JForex, TradeLocker, MatchTrader..."
          />
        )}

        <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
          <Lock className="size-3" />
          Nothing connects to your account during the beta — this just records
          what you trade with.
        </p>
      </NumberedSection>

      <NumberedSection num={2} title="Your broker (optional)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BROKERS.map((b) => {
            const isSelected = broker === b.id;
            return (
              <PickCard
                key={b.id}
                variant="single"
                selected={isSelected}
                onClick={() => setBroker(b.id)}
                className="flex-col items-center gap-2 p-4 pr-4 pt-5 text-center"
              >
                <LogoIcon
                  src={b.logo}
                  alt={b.label}
                  fallback={b.icon}
                  selected={isSelected}
                />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-white">{b.label}</p>
                  <p className="text-[11px] leading-snug text-slate-300">
                    {b.markets}
                  </p>
                </div>
              </PickCard>
            );
          })}
        </div>

        {brokerIsOther && (
          <OtherNameField
            label="What's your broker?"
            value={customBrokerName}
            onChange={setCustomBrokerName}
            placeholder="e.g. Tickmill, FXCM, Exness..."
          />
        )}

        <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
          <Clock className="size-3" />
          Broker and FX data-feed integrations are coming after the beta.
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
