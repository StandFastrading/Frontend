"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Search,
  Sliders,
  X,
} from "lucide-react";

import { TradeDetailView } from "@/features/journal/components/trade-detail-view";
import {
  applyFilters,
  applySort,
  BEHAVIOR_TAG_LABEL,
  BEHAVIOR_TAG_TONE,
  computeTradeHistorySummary,
  DEFAULT_TRADE_HISTORY_FILTERS,
  deriveTradeHistoryRows,
  distinctMarketTypes,
  distinctSetupTypes,
  TRADE_HISTORY_SORT_LABEL,
  type BehaviorTag,
  type DateRangeFilter,
  type DirectionFilter,
  type OutcomeFilter,
  type TradeHistoryFilters,
  type TradeHistoryRow,
  type TradeHistorySortKey,
} from "@/features/trades/trade-history-engine";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

// =============================================================================
// Trade History — the platform's closed-trade table
// =============================================================================
//
// One page. Summary row + filters + compact rows + the existing
// TradeDetailView modal. No new analytics engines. All trade data comes
// from `closedTrades`; behavior tags are derived once via the
// trade-history-engine.
// =============================================================================

const QUICK_FILTER_TAGS: BehaviorTag[] = [
  "clean",
  "stop_widened",
  "warning_ignored",
  "mistake_marked",
  "reflection_missing",
];

const OUTCOME_OPTIONS: { value: OutcomeFilter; label: string }[] = [
  { value: "all", label: "All outcomes" },
  { value: "win", label: "Wins" },
  { value: "loss", label: "Losses" },
  { value: "breakeven", label: "Breakeven" },
];

const DIRECTION_OPTIONS: { value: DirectionFilter; label: string }[] = [
  { value: "all", label: "Any direction" },
  { value: "Long", label: "Long" },
  { value: "Short", label: "Short" },
];

const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Past 7 days" },
  { value: "30d", label: "Past 30 days" },
  { value: "90d", label: "Past 90 days" },
];

const SORT_OPTIONS: { value: TradeHistorySortKey; label: string }[] = [
  { value: "newest", label: TRADE_HISTORY_SORT_LABEL.newest },
  { value: "oldest", label: TRADE_HISTORY_SORT_LABEL.oldest },
  { value: "highest_pnl", label: TRADE_HISTORY_SORT_LABEL.highest_pnl },
  { value: "lowest_pnl", label: TRADE_HISTORY_SORT_LABEL.lowest_pnl },
  { value: "best_r", label: TRADE_HISTORY_SORT_LABEL.best_r },
  { value: "worst_r", label: TRADE_HISTORY_SORT_LABEL.worst_r },
  {
    value: "most_rule_breaks",
    label: TRADE_HISTORY_SORT_LABEL.most_rule_breaks,
  },
  {
    value: "longest_duration",
    label: TRADE_HISTORY_SORT_LABEL.longest_duration,
  },
  { value: "ticker_az", label: TRADE_HISTORY_SORT_LABEL.ticker_az },
];

export function TradeHistoryPage() {
  // -- Inputs ---------------------------------------------------------
  const traderId = useAppStore((s) => s.user.userId);
  const closedTrades = useAppStore((s) => s.closedTrades);
  const behaviorEvents = useAppStore((s) => s.behaviorEvents);
  const monitoringEvents = useAppStore((s) => s.monitoringEvents);
  const interventions = useAppStore((s) => s.interventions);
  const tradeReflections = useAppStore((s) => s.tradeReflections);

  // -- Derived rows ---------------------------------------------------
  const allRows = useMemo(
    () =>
      deriveTradeHistoryRows({
        traderId,
        closedTrades,
        behaviorEvents,
        monitoringEvents,
        interventions,
        tradeReflections,
      }),
    [
      traderId,
      closedTrades,
      behaviorEvents,
      monitoringEvents,
      interventions,
      tradeReflections,
    ],
  );

  const setupOptions = useMemo(() => distinctSetupTypes(allRows), [allRows]);
  const marketOptions = useMemo(
    () => distinctMarketTypes(allRows),
    [allRows],
  );

  // -- Filter / sort state -------------------------------------------
  const [filters, setFilters] = useState<TradeHistoryFilters>(
    DEFAULT_TRADE_HISTORY_FILTERS,
  );
  const [sortKey, setSortKey] = useState<TradeHistorySortKey>("newest");
  // nowMs is held in state so the date-range cutoff is stable across
  // renders. We bump it every minute for "today" / "past 7 days" etc.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const filteredRows = useMemo(
    () => applyFilters(allRows, filters, nowMs),
    [allRows, filters, nowMs],
  );
  const sortedRows = useMemo(
    () => applySort(filteredRows, sortKey),
    [filteredRows, sortKey],
  );
  const summary = useMemo(
    () => computeTradeHistorySummary(filteredRows),
    [filteredRows],
  );

  // -- Detail modal ---------------------------------------------------
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(
    null,
  );
  const selectedTrade = useMemo(
    () =>
      selectedTradeId
        ? (closedTrades.find((t) => t.id === selectedTradeId) ?? null)
        : null,
    [closedTrades, selectedTradeId],
  );

  const toggleQuickFilter = (tag: BehaviorTag) => {
    setFilters((prev) => {
      const has = prev.quickFilters.includes(tag);
      return {
        ...prev,
        quickFilters: has
          ? prev.quickFilters.filter((t) => t !== tag)
          : [...prev.quickFilters, tag],
      };
    });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_TRADE_HISTORY_FILTERS);
    setSortKey("newest");
  };

  const filtersActive =
    filters.searchSymbol.length > 0 ||
    filters.outcome !== "all" ||
    filters.direction !== "all" ||
    filters.setupType !== "all" ||
    filters.marketType !== "all" ||
    filters.dateRange !== "all" ||
    filters.quickFilters.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Trade History
        </h1>
        <p className="text-sm text-muted-foreground">
          All completed trades with execution, risk, and behavioral context.
        </p>
      </div>

      {/* Summary row */}
      <SummaryRow summary={summary} />

      {/* Filters */}
      <FilterBar
        filters={filters}
        sortKey={sortKey}
        setupOptions={setupOptions}
        marketOptions={marketOptions}
        onFiltersChange={setFilters}
        onSortChange={setSortKey}
        onQuickFilterToggle={toggleQuickFilter}
        onReset={resetFilters}
        filtersActive={filtersActive}
        resultCount={sortedRows.length}
      />

      {/* Body */}
      {allRows.length === 0 ? (
        <EmptyState />
      ) : sortedRows.length === 0 ? (
        <NoMatchesState onReset={resetFilters} />
      ) : (
        <TradeList
          rows={sortedRows}
          onOpen={(id) => setSelectedTradeId(id)}
        />
      )}

      <TradeDetailView
        trade={selectedTrade}
        open={selectedTrade != null}
        onOpenChange={(next) => {
          if (!next) setSelectedTradeId(null);
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Summary row
// -----------------------------------------------------------------------------

function SummaryRow({
  summary,
}: {
  summary: ReturnType<typeof computeTradeHistorySummary>;
}) {
  const pnlTone =
    summary.netPnL > 0
      ? "text-emerald-300"
      : summary.netPnL < 0
        ? "text-rose-300"
        : "text-foreground";
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-card/40 p-3 backdrop-blur sm:grid-cols-3 lg:grid-cols-6">
      <SummaryCell label="Trades" value={String(summary.totalTrades)} />
      <SummaryCell
        label="Win Rate"
        value={`${summary.winRate.toFixed(1)}%`}
        tone={summary.winRate >= 50 ? "emerald" : "muted"}
      />
      <SummaryCell
        label="Net P/L"
        value={summary.netPnLLabel}
        toneClass={pnlTone}
      />
      <SummaryCell label="Avg R" value={summary.averageRLabel} />
      <SummaryCell
        label="Rule Break Rate"
        value={`${summary.ruleBreakRate.toFixed(1)}%`}
        tone={summary.ruleBreakRate > 33 ? "rose" : "muted"}
      />
      <SummaryCell
        label="Most Common Tag"
        value={summary.mostCommonTagLabel ?? "—"}
      />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone,
  toneClass,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "rose" | "muted";
  toneClass?: string;
}) {
  const cls =
    toneClass ??
    (tone === "emerald"
      ? "text-emerald-300"
      : tone === "rose"
        ? "text-rose-300"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground");
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", cls)}>
        {value}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Filter bar
// -----------------------------------------------------------------------------

const SELECT_CLASS =
  "h-8 min-w-0 rounded-md border border-white/10 bg-background/40 px-2 py-1 text-xs text-foreground transition-colors hover:border-white/20 focus:border-brand/40 focus:outline-none";

function FilterBar({
  filters,
  sortKey,
  setupOptions,
  marketOptions,
  onFiltersChange,
  onSortChange,
  onQuickFilterToggle,
  onReset,
  filtersActive,
  resultCount,
}: {
  filters: TradeHistoryFilters;
  sortKey: TradeHistorySortKey;
  setupOptions: string[];
  marketOptions: string[];
  onFiltersChange: (next: TradeHistoryFilters) => void;
  onSortChange: (next: TradeHistorySortKey) => void;
  onQuickFilterToggle: (tag: BehaviorTag) => void;
  onReset: () => void;
  filtersActive: boolean;
  resultCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card/40 p-3 backdrop-blur">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-md border border-white/10 bg-background/40 px-2.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={filters.searchSymbol}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                searchSymbol: e.target.value.toUpperCase(),
              })
            }
            placeholder="Search ticker…"
            className="h-8 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {filters.searchSymbol.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                onFiltersChange({ ...filters, searchSymbol: "" })
              }
              aria-label="Clear search"
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground/60">
            {resultCount} match{resultCount === 1 ? "" : "es"}
          </span>
          <SortDropdown sortKey={sortKey} onChange={onSortChange} />
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-2">
        <Select
          label="Date"
          value={filters.dateRange}
          options={DATE_RANGE_OPTIONS}
          onChange={(v) =>
            onFiltersChange({ ...filters, dateRange: v as DateRangeFilter })
          }
        />
        <Select
          label="Outcome"
          value={filters.outcome}
          options={OUTCOME_OPTIONS}
          onChange={(v) =>
            onFiltersChange({ ...filters, outcome: v as OutcomeFilter })
          }
        />
        <Select
          label="Direction"
          value={filters.direction}
          options={DIRECTION_OPTIONS}
          onChange={(v) =>
            onFiltersChange({
              ...filters,
              direction: v as DirectionFilter,
            })
          }
        />
        <Select
          label="Setup"
          value={filters.setupType}
          options={[
            { value: "all", label: "Any setup" },
            ...setupOptions.map((s) => ({ value: s, label: s })),
          ]}
          onChange={(v) => onFiltersChange({ ...filters, setupType: v })}
        />
        <Select
          label="Market"
          value={filters.marketType}
          options={[
            { value: "all", label: "Any market" },
            ...marketOptions.map((s) => ({ value: s, label: s })),
          ]}
          onChange={(v) => onFiltersChange({ ...filters, marketType: v })}
        />
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Sliders className="size-3 text-muted-foreground/60" />
        {QUICK_FILTER_TAGS.map((tag) => {
          const on = filters.quickFilters.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onQuickFilterToggle(tag)}
              aria-pressed={on}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] transition-colors",
                on
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-white/10 bg-background/30 text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]",
              )}
            >
              {BEHAVIOR_TAG_LABEL[tag]}
            </button>
          );
        })}
        {filtersActive ? (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            Reset filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={SELECT_CLASS}
        style={{ minWidth: "8rem" }}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{
              backgroundColor: "oklch(0.205 0 0)",
              color: "oklch(0.985 0 0)",
            }}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SortDropdown({
  sortKey,
  onChange,
}: {
  sortKey: TradeHistorySortKey;
  onChange: (next: TradeHistorySortKey) => void;
}) {
  return (
    <div className="relative">
      <select
        value={sortKey}
        onChange={(e) => onChange(e.target.value as TradeHistorySortKey)}
        className="h-7 appearance-none rounded-md border border-white/10 bg-background/40 pl-2.5 pr-7 text-xs text-foreground transition-colors hover:border-white/20 focus:border-brand/40 focus:outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{
              backgroundColor: "oklch(0.205 0 0)",
              color: "oklch(0.985 0 0)",
            }}
          >
            Sort: {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Trade list
// -----------------------------------------------------------------------------

const OUTCOME_TONE = {
  win: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30",
  loss: "text-rose-300 bg-rose-500/10 ring-rose-500/30",
  breakeven: "text-muted-foreground bg-foreground/[0.05] ring-white/10",
} as const;

const OUTCOME_LABEL = {
  win: "Win",
  loss: "Loss",
  breakeven: "Breakeven",
} as const;

const TAG_CHIP_TONE: Record<
  "emerald" | "amber" | "rose" | "muted",
  string
> = {
  emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  rose: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  muted: "bg-foreground/[0.05] text-muted-foreground ring-white/10",
};

function TradeList({
  rows,
  onOpen,
}: {
  rows: TradeHistoryRow[];
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <TradeRow key={row.id} row={row} onOpen={() => onOpen(row.id)} />
      ))}
    </ul>
  );
}

function TradeRow({
  row,
  onOpen,
}: {
  row: TradeHistoryRow;
  onOpen: () => void;
}) {
  const pnlTone =
    row.realizedPnL > 0
      ? "text-emerald-300"
      : row.realizedPnL < 0
        ? "text-rose-300"
        : "text-foreground";
  const displayTags = row.tags.filter((t) => t !== "reflection_missing");
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-card/40 px-3 py-2.5 text-left backdrop-blur transition-colors hover:border-white/20 hover:bg-card/60 focus-visible:border-brand/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/30"
        aria-label={`Open trade detail for ${row.symbol}`}
      >
        {/* Left — ticker / direction / setup / time */}
        <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {row.symbol}
            </span>
            <span className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
              {row.direction} · {row.marketType}
              {row.setupType ? ` · ${row.setupType}` : ""}
            </span>
          </div>
          <span className="truncate text-[0.65rem] text-muted-foreground">
            {formatDateTime(row.closedAt)} · {row.durationLabel} ·{" "}
            {row.positionSize.toLocaleString()} sh
          </span>
        </div>

        {/* Middle — entry/exit and risk */}
        <div className="flex min-w-0 flex-col gap-0.5 leading-tight tabular-nums">
          <span className="truncate text-xs font-semibold text-foreground/85">
            {row.entryPrice.toFixed(2)} → {row.exitPrice.toFixed(2)}
          </span>
          <span className="truncate text-[0.65rem] text-muted-foreground">
            Risk{" "}
            {row.originalRisk != null
              ? `$${row.originalRisk.toFixed(2)}`
              : "—"}
          </span>
        </div>

        {/* P/L + R */}
        <div className="flex min-w-0 flex-col items-end gap-0.5 leading-tight tabular-nums">
          <span className={cn("text-sm font-semibold", pnlTone)}>
            {row.pnlLabel}
          </span>
          <span className="text-[0.65rem] text-muted-foreground">
            {row.rLabel}
          </span>
        </div>

        {/* Right — outcome + tags + chevron */}
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] ring-1",
              OUTCOME_TONE[row.outcome],
            )}
          >
            {OUTCOME_LABEL[row.outcome]}
          </span>
          {displayTags.length > 0 ? (
            <span
              className={cn(
                "hidden rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] ring-1 sm:inline-flex",
                TAG_CHIP_TONE[BEHAVIOR_TAG_TONE[displayTags[0]]],
              )}
              title={displayTags.map((t) => BEHAVIOR_TAG_LABEL[t]).join(" · ")}
            >
              {BEHAVIOR_TAG_LABEL[displayTags[0]]}
              {displayTags.length > 1 ? ` +${displayTags.length - 1}` : ""}
            </span>
          ) : null}
          <ArrowRight className="size-3.5 text-muted-foreground/60" />
        </div>
      </button>
    </li>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

// -----------------------------------------------------------------------------
// Empty + no-match states
// -----------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-8 backdrop-blur">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Trade History
      </span>
      <p className="max-w-md text-sm text-muted-foreground">
        No closed trades yet. Trades will appear here after you log an exit.
      </p>
      <Link
        href="/desk"
        className="inline-flex items-center gap-2 rounded-md border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/15"
      >
        Enter Trade Desk
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function NoMatchesState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-white/10 bg-card/30 p-4 backdrop-blur">
      <span className="text-xs text-muted-foreground">
        No trades match the current filters.
      </span>
      <button
        type="button"
        onClick={onReset}
        className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-brand hover:text-brand/80"
      >
        Reset filters
      </button>
    </div>
  );
}
