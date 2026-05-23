import {
  Activity,
  AlertTriangle,
  ArrowUp,
  BookOpenCheck,
  Brain,
  CircleDollarSign,
  Flame,
  Hammer,
  LineChart,
  Lock,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

export type IconItem = {
  label: string;
  icon: LucideIcon;
};

export const HERO_PILLS: IconItem[] = [
  { label: "Behavioral Intervention", icon: ShieldCheck },
  { label: "Real-Time Tracking", icon: Activity },
  { label: "Discipline Scorecard", icon: LineChart },
];

export const BEHAVIORS: IconItem[] = [
  { label: "Revenge Trading", icon: RotateCcw },
  { label: "Stop Widening", icon: TrendingDown },
  { label: "Oversized Entries", icon: ArrowUp },
  { label: "Emotional Re-entries", icon: RefreshCcw },
  { label: "FOMO Chasing", icon: Flame },
  { label: "Breaking Your Own Rules", icon: AlertTriangle },
  { label: "Emotional Spirals During Volatility", icon: Brain },
];

export type HowItWorksStep = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    title: "Define Your Rules",
    body: "Set your risk, setups, and rules before the session begins.",
    icon: Target,
  },
  {
    title: "Standfast Interrupts Impulsive Decisions",
    body: "Adaptive checkpoints appear when your behavior shows risk.",
    icon: Brain,
  },
  {
    title: "Track Real Behavioral Patterns",
    body: "Every decision, emotion, and action is logged and analyzed.",
    icon: LineChart,
  },
];

export const BUILT_FOR_TRADERS: string[] = [
  "Reduce self-sabotage",
  "Build consistent discipline",
  "Protect your edge",
  "Perform under pressure",
];

export type MarketTile = {
  label: string;
  icon: LucideIcon;
};

export const MARKETS: MarketTile[] = [
  { label: "STOCKS", icon: LineChart },
  { label: "OPTIONS", icon: Activity },
  { label: "FOREX", icon: CircleDollarSign },
  { label: "FUTURES", icon: BookOpenCheck },
  { label: "CRYPTO", icon: Sparkles },
];

export type ValueProp = {
  title: string;
  body: string;
  icon: LucideIcon;
};

export const VALUE_PROPS: ValueProp[] = [
  {
    title: "Real-Time Behavioral Intervention",
    body: "Pause. Reflect. Execute with clarity.",
    icon: ShieldCheck,
  },
  {
    title: "Adaptive To You",
    body: "The system evolves as you trade.",
    icon: Sparkles,
  },
  {
    title: "Privacy First",
    body: "Your data is yours. Always.",
    icon: Lock,
  },
  {
    title: "Built By Traders",
    body: "For traders who want more.",
    icon: Hammer,
  },
];
