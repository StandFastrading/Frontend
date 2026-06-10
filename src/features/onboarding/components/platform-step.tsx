"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cloud,
  FileSpreadsheet,
  HardDrive,
  Layers,
  Lightbulb,
  LineChart,
  Lock,
  Mountain,
  Plus,
  Server,
  TrendingUp,
  Trophy,
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
    id: "tradovate",
    label: "Tradovate",
    description: "Futures trading built for active traders.",
    icon: TrendingUp,
    logo: "/logos/tradovate.svg",
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
    id: "tc2000",
    label: "TC2000",
    description: "Fast, reliable scanning and charting.",
    icon: Activity,
    logo: "/logos/tc2000.svg",
  },
  {
    id: "tradingview",
    label: "TradingView",
    description: "Charting, ideas, and market analysis.",
    icon: LineChart,
    logo: "/logos/tradingview.svg",
  },
  {
    id: "sierra",
    label: "Sierra Chart",
    description: "Professional charting and order routing.",
    icon: Mountain,
    logo: "/logos/sierra-chart.svg",
  },
  {
    id: "other-platform",
    label: "Other",
    description: "Can't find your platform? Choose custom option.",
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
    id: "amp",
    label: "AMP Futures",
    markets: "Futures broker",
    icon: BarChart3,
    logo: "/logos/amp-futures.svg",
  },
  {
    id: "topstepx",
    label: "TopstepX",
    markets: "Funded futures (Topstep)",
    icon: Trophy,
    logo: "/logos/topstepx.svg",
  },
  {
    id: "rithmic",
    label: "Rithmic",
    markets: "Futures data & routing",
    icon: Server,
    logo: "/logos/rithmic.svg",
  },
  {
    id: "tradestation",
    label: "TradeStation",
    markets: "Stocks, Options, Futures, Crypto",
    icon: TrendingUp,
    logo: "/logos/tradestation.svg",
  },
  {
    id: "ibkr",
    label: "Interactive Brokers",
    markets: "Multi-asset global broker",
    icon: Building2,
    logo: "/logos/interactive-brokers.svg",
  },
  {
    id: "other-broker",
    label: "Other Broker",
    markets: "Custom connection",
    icon: Plus,
  },
];

type Integration = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const INTEGRATIONS: Integration[] = [
  { id: "dropbox", label: "Dropbox", icon: Cloud },
  { id: "gdrive", label: "Google Drive", icon: HardDrive },
  { id: "ninjatrader", label: "NinjaTrader", icon: Layers },
  { id: "sierra-chart", label: "Sierra Chart", icon: Mountain },
  { id: "excel-csv", label: "Excel / CSV", icon: FileSpreadsheet },
];

const SUMMARY_BASE = [
  { label: "Experience", value: "Advanced" },
  { label: "Trading Profile", value: "Intraday" },
  { label: "Top Goals", value: "Consistency" },
  { label: "Primary Setup", value: "Breakout" },
  { label: "Risk Framework", value: "Moderate" },
];

export function PlatformStep() {
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
    console.log("[onboarding] platform", {
      platform,
      customPlatformName: platformIsOther ? customPlatformName.trim() : null,
      broker,
      customBrokerName: brokerIsOther ? customBrokerName.trim() : null,
    });
    router.push("/onboarding/review");
  }

  const activePlatform = PLATFORMS.find((p) => p.id === platform);
  const activeBroker = BROKERS.find((b) => b.id === broker);
  const platformDisplay =
    platformIsOther && customPlatformName.trim()
      ? customPlatformName.trim()
      : activePlatform?.label;
  const brokerDisplay =
    brokerIsOther && customBrokerName.trim()
      ? customBrokerName.trim()
      : activeBroker?.label;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 8 of 9 · Optional
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

      <NumberedSection
        num={1}
        title="Your primary platform"
        tag="optional"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            placeholder="e.g. MotiveWave, Quantower, NinjaTrader..."
          />
        )}
        <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
          <Lock className="size-3" />
          Nothing connects to your account during the beta — this just records
          what you trade with.
        </p>
      </NumberedSection>

      <NumberedSection num={2} title="Your broker" tag="optional">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            placeholder="e.g. Optimus Futures, Tastytrade, eToro..."
          />
        )}
        <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
          <Clock className="size-3" />
          Broker and data-feed integrations are coming after the beta.
        </p>
      </NumberedSection>

      <NumberedSection
        num={3}
        title="Additional integrations"
        tag="coming later"
      >
        <p className="text-[11px] leading-relaxed text-slate-400">
          These integrations aren&apos;t available during the beta — they&apos;re
          planned for later. Nothing here is connected today.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((i) => (
            <IntegrationRow key={i.id} icon={i.icon} label={i.label} />
          ))}
        </div>
      </NumberedSection>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
        <SummaryPanel
          platformLabel={platformDisplay}
          brokerLabel={brokerDisplay}
        />
        <ProTipPanel />
      </div>

      <StepFooter
        currentNum={8}
        onContinue={handleContinue}
        continueDisabled={!valid}
      />
    </div>
  );
}

function NumberedSection({
  num,
  title,
  tag,
  headerRight,
  children,
}: {
  num: number;
  title: string;
  tag?: string;
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
          <h2 className="text-sm font-semibold text-white">
            {title}
            {tag && (
              <span className="ml-2 text-[11px] font-normal text-slate-400">
                ({tag})
              </span>
            )}
          </h2>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      {children}
    </section>
  );
}

function IntegrationRow({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0c1428]/60 px-3 py-2.5 opacity-70">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-5 shrink-0 text-slate-500" />
        <span className="truncate text-sm font-semibold text-slate-300">
          {label}
        </span>
      </div>
      <span className="shrink-0 rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Coming later
      </span>
    </div>
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

function SummaryPanel({
  platformLabel,
  brokerLabel,
}: {
  platformLabel?: string;
  brokerLabel?: string;
}) {
  const rows = [
    ...SUMMARY_BASE,
    { label: "Platform", value: platformLabel ?? "—" },
    { label: "Broker", value: brokerLabel ?? "—" },
  ];

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="size-4 text-cyan-300" />
        <h3 className="text-sm font-semibold text-white">Your Setup Summary</h3>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-2 text-[11px]"
          >
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="size-3.5 text-lime-400" />
              {r.label}
            </span>
            <span className="truncate font-semibold text-white">
              {r.value}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/[0.06]"
      >
        Edit selections
        <ChevronRight className="size-3" />
      </button>
    </section>
  );
}

function ProTipPanel() {
  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="size-4 text-cyan-300" />
        <h3 className="text-sm font-semibold text-white">Pro Tip</h3>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-300">
        When broker integrations launch after the beta, connecting will unlock
        automatic trade logging and deeper analytics. For the beta, you&apos;ll
        log trades manually — no connection required.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        You can add connections later when they&apos;re available.
      </p>
    </section>
  );
}
