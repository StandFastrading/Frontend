"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cloud,
  FileSpreadsheet,
  HardDrive,
  Layers,
  Lightbulb,
  LineChart,
  Lock,
  Mountain,
  Plus,
  Search,
  Server,
  Shield,
  TrendingUp,
  Trophy,
  X,
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

const DEFAULT_INTEGRATIONS = new Set([
  "dropbox",
  "gdrive",
  "ninjatrader",
  "excel-csv",
]);

const SUMMARY_BASE = [
  { label: "Experience", value: "Advanced" },
  { label: "Trading Profile", value: "Intraday" },
  { label: "Top Goals", value: "Consistency" },
  { label: "Primary Setup", value: "Breakout" },
  { label: "Risk Framework", value: "Moderate" },
];

export function PlatformStep() {
  const router = useRouter();
  const [platform, setPlatform] = useState<string>("tradovate");
  const [broker, setBroker] = useState<string>("topstepx");
  const [customPlatformName, setCustomPlatformName] = useState("");
  const [customBrokerName, setCustomBrokerName] = useState("");
  const [integrations, setIntegrations] = useState<Set<string>>(
    DEFAULT_INTEGRATIONS,
  );
  const [customIntegrations, setCustomIntegrations] = useState<
    { id: string; label: string }[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  const platformIsOther = platform === "other-platform";
  const brokerIsOther = broker === "other-broker";

  const valid =
    platform !== "" &&
    broker !== "" &&
    (!platformIsOther || customPlatformName.trim() !== "") &&
    (!brokerIsOther || customBrokerName.trim() !== "");

  function toggleIntegration(id: string) {
    setIntegrations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCustomIntegration() {
    const label = draft.trim();
    if (!label) return;
    const id = `integ-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomIntegrations((prev) => [...prev, { id, label }]);
    setIntegrations((prev) => new Set(prev).add(id));
    setDraft("");
  }

  function removeCustomIntegration(id: string) {
    setCustomIntegrations((prev) => prev.filter((c) => c.id !== id));
    setIntegrations((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleContinue() {
    console.log("[onboarding] platform", {
      platform,
      customPlatformName: platformIsOther ? customPlatformName.trim() : null,
      broker,
      customBrokerName: brokerIsOther ? customBrokerName.trim() : null,
      integrations: Array.from(integrations),
      customIntegrations,
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
  const activeIntegrationCount =
    Array.from(integrations).filter(
      (id) =>
        INTEGRATIONS.some((i) => i.id === id) ||
        customIntegrations.some((c) => c.id === id),
    ).length;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 8 of 9
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Platform &amp; Broker
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Connect the tools you use to trade. We&apos;ll sync your data securely
          to power your insights.
        </p>
      </div>

      <NumberedSection num={1} title="Choose your primary platform">
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
        <div className="flex flex-col items-start justify-between gap-2 pt-1 sm:flex-row sm:items-center">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="size-3" />
            We use read-only connections. Your credentials are never stored.
          </p>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
          >
            Learn more about security
            <ArrowRight className="size-3" />
          </button>
        </div>
      </NumberedSection>

      <NumberedSection
        num={2}
        title="Connect your broker"
        headerRight={
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-cyan-300"
          >
            Don&apos;t see your broker? Search all
            <Search className="size-3" />
          </button>
        }
      >
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
        <div className="flex flex-col items-start justify-between gap-2 pt-1 sm:flex-row sm:items-center">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Shield className="size-3" />
            We support 100+ brokers and data feeds.
          </p>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
          >
            View all supported brokers
            <ArrowRight className="size-3" />
          </button>
        </div>
      </NumberedSection>

      <NumberedSection
        num={3}
        title="Additional integrations"
        tag="optional"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((i) => {
            const Icon = i.icon;
            const on = integrations.has(i.id);
            return (
              <IntegrationRow
                key={i.id}
                icon={Icon}
                label={i.label}
                on={on}
                onToggle={() => toggleIntegration(i.id)}
              />
            );
          })}
          {customIntegrations.map((i) => (
            <IntegrationRow
              key={i.id}
              icon={Plus}
              label={i.label}
              on={integrations.has(i.id)}
              onToggle={() => toggleIntegration(i.id)}
              onRemove={() => removeCustomIntegration(i.id)}
            />
          ))}
        </div>

        {creating ? (
          <div className="flex gap-2 rounded-lg border border-cyan-400/30 bg-[#08111f]/80 p-2 duration-200 animate-in fade-in slide-in-from-top-1">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomIntegration();
                } else if (e.key === "Escape") {
                  setCreating(false);
                  setDraft("");
                }
              }}
              placeholder="e.g. MotiveWave, Quantower..."
              className="h-8 flex-1 border-white/[0.08] bg-[#0c1428]/80 text-xs text-white placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30"
            />
            <button
              type="button"
              onClick={addCustomIntegration}
              disabled={!draft.trim()}
              className={cn(
                "flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold text-lime-950",
                "bg-gradient-to-r from-lime-400 to-lime-500",
                "shadow-[0_0_15px_-3px_rgba(132,204,22,0.45)]",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-0.5 hover:from-lime-300 hover:to-lime-400",
                "disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none",
              )}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setDraft("");
              }}
              className="flex h-8 items-center justify-center rounded-md border border-white/[0.08] bg-[#0c1428]/80 px-2.5 text-xs text-slate-300 transition-colors hover:border-white/[0.15] hover:text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-cyan-400/30 bg-cyan-400/[0.03] px-3 py-2 text-xs font-semibold text-cyan-300 transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-400/[0.08]"
          >
            <Plus className="size-3.5" />
            Add custom integration
          </button>
        )}
      </NumberedSection>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
        <SummaryPanel
          platformLabel={platformDisplay}
          brokerLabel={brokerDisplay}
          integrationCount={activeIntegrationCount}
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
  on,
  onToggle,
  onRemove,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  on: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        on
          ? "border-cyan-400/40 bg-cyan-400/[0.05]"
          : "border-white/[0.08] bg-[#0c1428]/80",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          className={cn(
            "size-5 shrink-0 transition-colors",
            on
              ? "text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.4)]"
              : "text-lime-400/85",
          )}
        />
        <span className="truncate text-sm font-semibold text-white">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="flex size-5 items-center justify-center rounded-md text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
          >
            <X className="size-3" />
          </button>
        )}
        <Toggle checked={on} onChange={onToggle} />
      </div>
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

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-cyan-400" : "bg-white/[0.10]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white transition-all duration-200",
          checked
            ? "left-[18px] shadow-[0_0_8px_rgba(34,211,238,0.55)]"
            : "left-0.5",
        )}
      />
    </button>
  );
}

function SummaryPanel({
  platformLabel,
  brokerLabel,
  integrationCount,
}: {
  platformLabel?: string;
  brokerLabel?: string;
  integrationCount: number;
}) {
  const rows = [
    ...SUMMARY_BASE,
    { label: "Platform", value: platformLabel ?? "—" },
    { label: "Broker", value: brokerLabel ?? "—" },
    { label: "Integrations", value: `${integrationCount} active` },
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
        Connecting your platform and broker unlocks automatic trade logging,
        deeper analytics, and real-time behavioral insights.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        You can always add or change connections later.
      </p>
    </section>
  );
}
