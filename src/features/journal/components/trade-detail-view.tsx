"use client";

import { useMemo } from "react";
import { Image as ImageIcon, Sparkles, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import {
  BEHAVIOR_EVENT_TYPES,
  type BehaviorEventType,
} from "@/lib/behavior-events";
import { classifyTrade } from "@/lib/journal/trade-classification";
import { auditTrade } from "@/lib/journal/trade-rule-audit";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import type { ClosedTrade, InterventionEvent } from "@/types";

import {
  TradeBehaviorTimeline,
  buildTradeTimeline,
  findEscalationAnchor,
} from "@/features/journal/components/trade-behavior-timeline";
import { EscalationAnchorCard } from "@/features/journal/components/escalation-anchor-card";
import { TradeClassificationCard } from "@/features/journal/components/trade-classification-card";
import { TradeDetailOverview } from "@/features/journal/components/trade-detail-overview";
import { TradePretradeContext } from "@/features/journal/components/trade-pretrade-context";
import { TradeReflectionPanel } from "@/features/journal/components/trade-reflection-panel";
import { TradeRiskTrajectory } from "@/features/journal/components/trade-risk-trajectory";
import { TradeRuleAuditPanel } from "@/features/journal/components/trade-rule-audit-panel";

// Trade Detail View — modal-style dialog that loads when a trade is
// clicked in the Trades tab. Wider than the default Dialog primitive
// (max-w-3xl) with internal scroll so all seven sections fit without
// the trader losing context.

// Match an InterventionEvent to this trade. Decisions don't carry a
// direct tradeId; we link by symbol + temporal proximity to the
// approval/activation window (interventions land before activation,
// usually within a few minutes).
function linkInterventionsToTrade(
  trade: ClosedTrade,
  interventions: InterventionEvent[],
): InterventionEvent[] {
  const approvedMs = new Date(trade.approvedAt).getTime();
  const activatedMs = new Date(trade.activatedAt).getTime();
  if (!Number.isFinite(approvedMs) || !Number.isFinite(activatedMs)) {
    return [];
  }
  // Window: ten minutes before approval through activation. Wider than
  // the typical sub-minute gap so we tolerate older sessions where the
  // clock was a bit loose.
  const windowStart = approvedMs - 10 * 60_000;
  return interventions.filter((i) => {
    if (i.symbol !== trade.symbol) return false;
    const t = new Date(i.timestamp).getTime();
    if (!Number.isFinite(t)) return false;
    return t >= windowStart && t <= activatedMs + 60_000;
  });
}

export function TradeDetailView({
  trade,
  open,
  onOpenChange,
}: {
  trade: ClosedTrade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const allBehaviorEvents = useAppStore((s) => s.behaviorEvents);
  const allMonitoringEvents = useAppStore((s) => s.monitoringEvents);
  const allInterventions = useAppStore((s) => s.interventions);
  const allClosedTrades = useAppStore((s) => s.closedTrades);
  const riskRules = useAppStore((s) => s.riskRules);

  // Filter event streams to this specific trade.
  const filtered = useMemo(() => {
    if (!trade) {
      return {
        behaviorEvents: [],
        monitoringEvents: [],
        interventions: [],
      };
    }
    const behaviorEvents = allBehaviorEvents.filter((e) => {
      const meta = e.metadata as Record<string, unknown> | undefined;
      return meta?.tradeId === trade.id;
    });
    const monitoringEvents = allMonitoringEvents.filter(
      (m) => m.tradeId === trade.id,
    );
    const interventions = linkInterventionsToTrade(trade, allInterventions);
    return { behaviorEvents, monitoringEvents, interventions };
  }, [trade, allBehaviorEvents, allMonitoringEvents, allInterventions]);

  // Synthesize approval + activation + close anchors into the behavior
  // list for the timeline if those weren't separately persisted —
  // `trade` carries the timestamps and they're behaviorally meaningful.
  const timelineEvents = useMemo(() => {
    if (!trade) return [];
    const base = [...filtered.behaviorEvents];
    const hasApproval = base.some(
      (e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_APPROVED,
    );
    const hasActivation = base.some(
      (e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE,
    );
    const hasClose = base.some(
      (e) => e.eventType === BEHAVIOR_EVENT_TYPES.TRADE_CLOSED,
    );
    if (!hasApproval) {
      base.push(
        syntheticEvent(
          `synth-approved-${trade.id}`,
          BEHAVIOR_EVENT_TYPES.TRADE_APPROVED,
          "Trade approved",
          "Trade passed the rule check and entered the approval state.",
          trade.approvedAt,
        ),
      );
    }
    if (!hasActivation) {
      base.push(
        syntheticEvent(
          `synth-activated-${trade.id}`,
          BEHAVIOR_EVENT_TYPES.TRADE_MARKED_ACTIVE,
          "Trade activated",
          "Trader manually confirmed the position was entered.",
          trade.activatedAt,
        ),
      );
    }
    if (!hasClose) {
      base.push(
        syntheticEvent(
          `synth-closed-${trade.id}`,
          BEHAVIOR_EVENT_TYPES.TRADE_CLOSED,
          "Trade closed",
          `Closed as ${trade.outcome}.`,
          trade.closedAt,
        ),
      );
    }
    return base;
  }, [trade, filtered.behaviorEvents]);

  const classification = useMemo(() => {
    if (!trade) return null;
    return classifyTrade(
      trade,
      filtered.behaviorEvents,
      filtered.monitoringEvents,
      filtered.interventions,
    );
  }, [trade, filtered]);

  const audit = useMemo(() => {
    if (!trade) return null;
    return auditTrade(
      trade,
      filtered.behaviorEvents,
      filtered.interventions,
      riskRules,
    );
  }, [trade, filtered, riskRules]);

  const timeline = useMemo(
    () =>
      trade
        ? buildTradeTimeline(
            timelineEvents,
            filtered.monitoringEvents,
            filtered.interventions,
          )
        : [],
    [trade, timelineEvents, filtered.monitoringEvents, filtered.interventions],
  );

  // The single moment behavioral integrity shifted. Surfaced above the
  // timeline so the trader sees the inflection point before scanning
  // the full event list. Clean trades return null and the card is
  // simply omitted.
  const escalationAnchor = useMemo(
    () => findEscalationAnchor(timeline),
    [timeline],
  );

  if (!trade) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Dialog renders into a body-level portal, escaping the
            dashboard layout's `dark` class. Re-anchor `dark` here so
            the modal's bg-card / text-foreground tokens resolve to the
            dark theme — otherwise the popup renders white. */}
        <DialogOverlay className="dark bg-background/60" />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "dark fixed top-1/2 left-1/2 z-50 flex max-h-[92vh] w-[min(95vw,52rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-0 overflow-hidden rounded-2xl bg-card text-foreground ring-1 ring-white/15 outline-none backdrop-blur",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100",
          )}
        >
          <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-card/95 px-6 py-4 backdrop-blur">
            <div className="flex flex-col gap-1 leading-tight">
              <DialogPrimitive.Title className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Trade Detail
              </DialogPrimitive.Title>
              <span className="text-base font-semibold text-foreground">
                {trade.symbol} · {trade.direction} ·{" "}
                <span className="text-muted-foreground">{trade.outcome}</span>
              </span>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">
                Behavioral replay for this trade — execution record, rule
                adherence, classification, and reflection.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              aria-label="Close trade detail"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-5">
              {/* Verdict first — behavioral classification leads so the
                  trader sees what kind of trade this was before the
                  numbers. */}
              {classification ? (
                <TradeClassificationCard classification={classification} />
              ) : null}

              <TradeDetailOverview trade={trade} />

              <TradePretradeContext
                trade={trade}
                interventions={filtered.interventions}
                allClosedTrades={allClosedTrades}
              />

              <TradeRiskTrajectory
                trade={trade}
                behaviorEvents={filtered.behaviorEvents}
              />

              {escalationAnchor ? (
                <EscalationAnchorCard anchor={escalationAnchor} />
              ) : null}

              <TradeBehaviorTimeline entries={timeline} />

              {audit ? <TradeRuleAuditPanel audit={audit} /> : null}

              <TradeReflectionPanel
                tradeId={trade.id}
                tradingDate={trade.tradingDate}
              />

              <FutureSection
                Icon={ImageIcon}
                title="Trade Screenshot / Chart Review"
                body="Chart screenshots and markups will appear here in a future version."
              />

              <FutureSection
                Icon={Sparkles}
                title="Behavioral Mentor Notes"
                body="Future AI mentor feedback will compare this trade against your behavioral history and reflection patterns."
                badge="Future capability"
              />
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function syntheticEvent(
  id: string,
  eventType: BehaviorEventType,
  title: string,
  description: string,
  timestamp: string,
) {
  // Minimal synthetic BehaviorEvent — only the fields the timeline
  // builder reads. Cast through unknown so we don't need to fabricate
  // the whole schema.
  return {
    id,
    eventType,
    displayTitle: title,
    displayDescription: description,
    timestamp,
    source: "system",
    severity: "info",
    triggeredRules: [],
    totalRisk: null,
    accountRiskPercent: null,
    metadata: undefined,
  } as unknown as import("@/types").BehaviorEvent;
}

// -----------------------------------------------------------------------------
// Future section placeholder — clean unavailable state. No fake buttons,
// no fake AI text. Just a clearly marked "future capability" surface.
// -----------------------------------------------------------------------------
function FutureSection({
  Icon,
  title,
  body,
  badge = "Coming soon",
}: {
  Icon: typeof ImageIcon;
  title: string;
  body: string;
  badge?: string;
}) {
  return (
    <section
      aria-label={title}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/10 bg-card/30 p-5 backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          {title}
        </span>
        <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80 ring-1 ring-white/10">
          {badge}
        </span>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </section>
  );
}
