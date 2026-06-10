"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  AreaChart,
  ArrowDownUp,
  BarChart3,
  CalendarDays,
  CandlestickChart,
  ChevronDown,
  ChevronUp,
  Flag,
  FlagTriangleRight,
  Lightbulb,
  LineChart,
  Newspaper,
  Plus,
  Star,
  Triangle,
  TriangleAlert,
  TrendingUp,
  Undo2,
} from "lucide-react";

import { SETUP_LIBRARY } from "@/features/onboarding/setups-data";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { Callout } from "./callout";
import { PickCard } from "./pick-card";
import { SetupLibrary, type CustomSetup } from "./setup-library";
import { StepFooter } from "./step-footer";

type Setup = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRICE_ACTION: Setup[] = [
  {
    id: "breakout",
    label: "Breakout",
    description: "Price breaks key levels with strong momentum.",
    icon: Flag,
  },
  {
    id: "pullback",
    label: "Pullback / Retest",
    description: "Pullback to support or resistance levels.",
    icon: Undo2,
  },
  {
    id: "reversal",
    label: "Reversal",
    description: "Price reverses direction at key levels.",
    icon: ArrowDownUp,
  },
  {
    id: "continuation",
    label: "Continuation",
    description: "Trend continues after a brief consolidation.",
    icon: TrendingUp,
  },
];

const CHART_PATTERNS: Setup[] = [
  {
    id: "flags",
    label: "Flags / Pennants",
    description: "Short-term continuation patterns.",
    icon: FlagTriangleRight,
  },
  {
    id: "triangles",
    label: "Triangles",
    description: "Ascending, descending, or symmetrical.",
    icon: Triangle,
  },
  {
    id: "wedges",
    label: "Wedges",
    description: "Rising or falling wedge patterns.",
    icon: TriangleAlert,
  },
  {
    id: "double-tops",
    label: "Double Tops / Bottoms",
    description: "Reversal patterns at key levels.",
    icon: Activity,
  },
];

const OTHER_SETUPS: Setup[] = [
  {
    id: "volume-spikes",
    label: "Volume Spikes",
    description: "High volume moves and breakouts.",
    icon: BarChart3,
  },
  {
    id: "news-catalyst",
    label: "News Catalyst",
    description: "News-driven setups and events.",
    icon: Newspaper,
  },
  {
    id: "earnings",
    label: "Earnings Plays",
    description: "Earnings-related opportunities.",
    icon: CalendarDays,
  },
  {
    id: "gap-plays",
    label: "Gap Plays",
    description: "Gap ups, gap downs, and gap fills.",
    icon: AreaChart,
  },
];

export function SetupsStep() {
  const router = useRouter();
  const riskRules = useAppStore((s) => s.riskRules);
  const saveRiskRules = useAppStore((s) => s.saveRiskRules);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moreOpen, setMoreOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customSetups, setCustomSetups] = useState<CustomSetup[]>([]);

  const valid = selected.size > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCustomSetup(label: string) {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCustomSetups((prev) => [...prev, { id, label }]);
    setSelected((prev) => new Set(prev).add(id));
  }

  function handleContinue() {
    // Resolve selected setup IDs to their human-readable labels and merge
    // into riskRules.allowedSetups — that array is what the Trade Desk
    // validation engine matches against. Merge (not replace) so traders who
    // walk multiple asset-class onboardings (Stocks + Futures + Forex +
    // Crypto) end up with the union, not whichever was completed last.
    const idToLabel = new Map<string, string>();
    for (const s of [...PRICE_ACTION, ...CHART_PATTERNS, ...OTHER_SETUPS]) {
      idToLabel.set(s.id, s.label);
    }
    for (const cat of SETUP_LIBRARY) {
      for (const s of cat.setups) idToLabel.set(s.id, s.label);
    }
    for (const s of customSetups) idToLabel.set(s.id, s.label);

    const selectedLabels = Array.from(selected)
      .map((id) => idToLabel.get(id))
      .filter((label): label is string => Boolean(label));
    const allowedSetups = Array.from(
      new Set([...riskRules.allowedSetups, ...selectedLabels]),
    );

    saveRiskRules({ ...riskRules, allowedSetups });
    router.push("/onboarding/behavioral");
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 5 of 9
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your setups
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          What types of setups do you trade? Select all that apply.
        </p>
      </div>

      <SetupGroup
        groupIcon={CandlestickChart}
        title="Price Action"
        setups={PRICE_ACTION}
        selected={selected}
        onToggle={toggle}
      />
      <SetupGroup
        groupIcon={LineChart}
        title="Chart Patterns"
        setups={CHART_PATTERNS}
        selected={selected}
        onToggle={toggle}
      />
      <SetupGroup
        groupIcon={Star}
        title="Other Setups"
        setups={OTHER_SETUPS}
        selected={selected}
        onToggle={toggle}
      />

      <section className="overflow-hidden rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.03]">
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-cyan-400/[0.05]"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan-400/[0.15] text-cyan-300">
              <Plus className="size-4" />
            </div>
            <p className="text-sm font-semibold tracking-wide text-cyan-300">
              MORE SETUPS
            </p>
            <p className="hidden text-xs text-slate-300 sm:block">
              Don&apos;t see your setup? Explore the full library or create your
              own.
            </p>
          </div>
          {moreOpen ? (
            <ChevronUp className="size-4 text-cyan-300" />
          ) : (
            <ChevronDown className="size-4 text-cyan-300" />
          )}
        </button>
        {moreOpen && (
          <SetupLibrary
            selected={selected}
            onToggle={toggle}
            search={search}
            onSearch={setSearch}
            customSetups={customSetups}
            onAddCustomSetup={addCustomSetup}
          />
        )}
      </section>

      <Callout
        icon={Lightbulb}
        title="Your setups shape what we surface."
        text="StandFast uses these to deliver smarter scans, insights, and behavioral interventions tailored to how you trade."
      />

      <StepFooter
        currentNum={5}
        onContinue={handleContinue}
        continueDisabled={!valid}
      />
    </div>
  );
}

function SetupGroup({
  groupIcon: GroupIcon,
  title,
  setups,
  selected,
  onToggle,
}: {
  groupIcon: React.ComponentType<{ className?: string }>;
  title: string;
  setups: Setup[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
      <div className="mb-4 flex items-center gap-2">
        <GroupIcon className="size-5 text-cyan-300" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {setups.map((s) => {
          const Icon = s.icon;
          const isSelected = selected.has(s.id);
          return (
            <PickCard
              key={s.id}
              variant="multi"
              selected={isSelected}
              onClick={() => onToggle(s.id)}
              className="flex-col items-start gap-2 p-3.5 pr-9"
            >
              <Icon
                className={cn(
                  "size-6 transition-all duration-300",
                  isSelected
                    ? "text-lime-400 drop-shadow-[0_0_6px_rgba(163,230,53,0.45)]"
                    : "text-lime-400/85",
                )}
              />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-white">{s.label}</p>
                <p className="text-[11px] leading-snug text-slate-300">
                  {s.description}
                </p>
              </div>
            </PickCard>
          );
        })}
      </div>
    </section>
  );
}
