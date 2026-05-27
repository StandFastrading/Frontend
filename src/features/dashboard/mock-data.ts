import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Info,
  type LucideIcon,
} from "lucide-react";

export const SESSION = {
  label: "Regular Hours",
  startedAt: "9:30 AM",
  state: "Calm & Focused",
  stateMessage: "You are operating within your rules.",
} as const;

export const DISCIPLINE = {
  score: 82,
  max: 100,
  delta: 12,
  comparedTo: "vs last session",
} as const;

export const RULES_FOLLOWED = {
  current: 7,
  total: 8,
  adherence: 88,
} as const;

export const IMPULSIVE_ACTIONS = {
  value: 2,
  message: "Above your limit",
} as const;

export const WARNINGS_IGNORED = {
  value: 1,
  message: "Review recommended",
} as const;

type FeedTone = "rose" | "emerald" | "amber" | "brand";

export type BehaviorFeedEntry = {
  time: string;
  icon: LucideIcon;
  tone: FeedTone;
  title: string;
  description: string;
};

export const BEHAVIOR_FEED: BehaviorFeedEntry[] = [
  {
    time: "10:42 AM",
    icon: AlertTriangle,
    tone: "rose",
    title: "Rapid re-entry attempt detected",
    description: "You took 2 trades within 8 minutes of each other.",
  },
  {
    time: "10:51 AM",
    icon: CheckCircle2,
    tone: "emerald",
    title: "Trade avoided after intervention",
    description: "You paused and did not take the setup.",
  },
  {
    time: "11:07 AM",
    icon: AlertTriangle,
    tone: "amber",
    title: "Stop moved beyond predefined rule",
    description: "Your stop was moved farther from entry.",
  },
  {
    time: "11:23 AM",
    icon: CheckCircle2,
    tone: "emerald",
    title: "Position size reduced within rules",
    description: "Great job staying within your risk limit.",
  },
  {
    time: "11:45 AM",
    icon: Info,
    tone: "brand",
    title: "Emotional state stabilized",
    description: "Your behavior is back within normal range.",
  },
];

export const ACTIVE_RISK = {
  dailyUsage: { current: 1.32, max: 4.0, percent: 33 },
  openRisk: 0.62,
  potentialRisk: 0.7,
  maxDailyLoss: { current: -0.68, max: -2.0, percent: 34 },
} as const;

type PatternTone = "rose" | "amber" | "neutral";

export type TodayPattern = {
  icon: LucideIcon;
  tone: PatternTone;
  title: string;
  value: string;
};

export const TODAYS_PATTERNS: TodayPattern[] = [
  {
    icon: AlertCircle,
    tone: "rose",
    title: "Most Common Mistake",
    value: "Re-entry after loss",
  },
  {
    icon: Clock,
    tone: "neutral",
    title: "Most Disciplined Period",
    value: "9:30 AM – 10:30 AM",
  },
  {
    icon: Activity,
    tone: "amber",
    title: "Emotional Spike Detected",
    value: "After 2nd loss of the day",
  },
  {
    icon: Award,
    tone: "neutral",
    title: "Best Rule Adherence",
    value: "During first hour",
  },
];

export const PRE_SESSION_CHECKLIST = {
  completed: 8,
  total: 8,
  items: [
    { label: "Max daily risk set", value: "4.00R" },
    { label: "Allowed setups reviewed", value: "3" },
    { label: "Position size limits set", value: "Yes" },
    { label: "Red day rules enabled", value: "Yes" },
    { label: "Emotional note added", value: "Yes" },
  ],
} as const;

export const RULES_STATUS = {
  configured: 8,
  total: 8,
  rules: [
    { label: "Max Daily Risk", value: "4.00R" },
    { label: "Allowed Setups", value: "5 Setups" },
    { label: "Position Size Limits", value: "Active" },
    { label: "Red Day Rules", value: "Active" },
    { label: "Re-entry Cooldown", value: "18 min" },
    { label: "Consecutive Loss Limit", value: "3 Losses" },
    { label: "Behavioral Rules", value: "Active" },
    { label: "Pre-Session Checklist", value: "8/8" },
  ],
} as const;
