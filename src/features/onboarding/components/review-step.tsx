"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  BarChart3,
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  Cloud,
  FileSpreadsheet,
  HardDrive,
  Layers,
  Link2,
  Lock,
  Mail,
  Mountain,
  PencilLine,
  Plus,
  Settings2,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { StepFooter } from "./step-footer";

type SetupReviewItem = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

const SETUP_REVIEW: SetupReviewItem[] = [
  {
    label: "Experience",
    value: "Advanced",
    icon: Star,
    href: "/onboarding/experience",
  },
  {
    label: "Trading Profile",
    value: "Intraday Trader",
    icon: User,
    href: "/onboarding/profile",
  },
  {
    label: "Top Goals",
    value: "Consistency",
    icon: Target,
    href: "/onboarding/goals",
  },
  {
    label: "Primary Setup",
    value: "Breakout",
    icon: TrendingUp,
    href: "/onboarding/setups",
  },
  {
    label: "Risk Framework",
    value: "Moderate",
    icon: Shield,
    href: "/onboarding/risk",
  },
  {
    label: "Platform & Broker",
    value: "Tradovate · TopstepX",
    icon: Link2,
    href: "/onboarding/platform",
  },
];

const PRIVACY_ITEMS = [
  {
    icon: Lock,
    title: "Your data is encrypted",
    text: "We use bank-level encryption to protect your information.",
  },
  {
    icon: Shield,
    title: "We never sell your data",
    text: "Your data is used only to power your personalized insights.",
  },
  {
    icon: Settings2,
    title: "You're always in control",
    text: "You can update settings or disconnect integrations anytime.",
  },
];

const CONNECTED_INTEGRATIONS = [
  { label: "Dropbox", icon: Cloud },
  { label: "Google Drive", icon: HardDrive },
  { label: "NinjaTrader", icon: Layers },
  { label: "Sierra Chart", icon: Mountain },
  { label: "Excel / CSV", icon: FileSpreadsheet },
];

const NOTIFICATION_PREFS = [
  { icon: Bell, label: "Dashboard notifications" },
  { icon: Mail, label: "Email reports" },
  { icon: CalendarClock, label: "Weekly performance summary" },
  { icon: Brain, label: "Behavioral nudges & reminders" },
];

const FINAL_CHECKLIST = [
  "Profile completed",
  "Risk framework configured",
  "Platforms & broker connected",
  "Data integrations active",
  "Notifications configured",
];

export function ReviewStep() {
  const router = useRouter();

  function handleActivate() {
    console.log("[onboarding] activate");
    router.push("/onboarding/complete");
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
          Step 9 of 9
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Review &amp; Activate
        </h1>
        <p className="text-sm leading-relaxed text-slate-300">
          Review your setup before we activate your behavioral edge engine.
        </p>
      </div>

      <NumberedSection num={1} title="Review your setup">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SETUP_REVIEW.map((item) => (
            <SetupCard key={item.label} item={item} />
          ))}
        </div>
      </NumberedSection>

      <NumberedSection num={2} title="Data, privacy & security">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-2.5">
            {PRIVACY_ITEMS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#0c1428]/80 p-3"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.10] text-cyan-300">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-white">
                      {p.title}
                    </p>
                    <p className="text-[11px] leading-snug text-slate-300">
                      {p.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#0c1428]/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Connected integrations
              </h3>
              <span className="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-semibold text-lime-300">
                {CONNECTED_INTEGRATIONS.length} Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CONNECTED_INTEGRATIONS.map((i) => {
                const Icon = i.icon;
                return (
                  <div
                    key={i.label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Icon className="size-3.5 shrink-0 text-lime-400/85" />
                      <span className="truncate text-[11px] font-medium text-white">
                        {i.label}
                      </span>
                    </span>
                    <CheckCircle2 className="size-3.5 shrink-0 text-lime-400" />
                  </div>
                );
              })}
              <button
                type="button"
                className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-cyan-400/30 bg-cyan-400/[0.03] px-2.5 py-2 text-[11px] font-semibold text-cyan-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/[0.08]"
              >
                <Plus className="size-3" />
                Add integration
              </button>
            </div>
          </div>
        </div>
      </NumberedSection>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
          <div className="flex flex-col gap-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Bell className="size-4 text-cyan-300" />
              Notification preferences
            </h3>
            <p className="text-[11px] text-slate-300">
              Choose how you want to stay informed.
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {NOTIFICATION_PREFS.map((n) => {
              const Icon = n.icon;
              return (
                <li
                  key={n.label}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-3.5 text-lime-400/85" />
                    <span className="text-xs text-white">{n.label}</span>
                  </span>
                  <CircleCheck className="size-4 text-lime-400" />
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/[0.06]"
          >
            <PencilLine className="size-3" />
            Edit preferences
          </button>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
          <div className="flex flex-col gap-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sparkles className="size-4 text-lime-400" />
              Final checklist
            </h3>
            <p className="text-[11px] text-slate-300">
              You&apos;re all set. Here&apos;s what&apos;s ready to go.
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {FINAL_CHECKLIST.map((c) => (
              <li
                key={c}
                className="flex items-center gap-2 rounded-lg border border-lime-400/20 bg-lime-400/[0.04] px-3 py-2"
              >
                <CircleCheck className="size-4 shrink-0 text-lime-400" />
                <span className="text-xs text-white">{c}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.04] p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.12] text-cyan-300">
          <BarChart3 className="size-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-white">
            Activate when you&apos;re ready.
          </p>
          <p className="text-xs leading-relaxed text-slate-300">
            Once activated, StandFast starts monitoring your trades, surfacing
            insights, and delivering behavioral interventions tailored to your
            setup. You can update any of this anytime from your settings.
          </p>
        </div>
      </div>

      <StepFooter
        currentNum={9}
        onContinue={handleActivate}
        continueLabel="Finalize Onboarding"
      />
    </div>
  );
}

function NumberedSection({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0a1122]/70 p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/50 text-xs font-semibold text-cyan-300">
          {num}
        </div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SetupCard({ item }: { item: SetupReviewItem }) {
  const Icon = item.icon;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#0c1428]/80 p-4 transition-all duration-200 hover:border-cyan-400/30 hover:bg-[#0e1730]/90">
      <div className="flex items-center justify-center">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-full",
            "border border-lime-400/30 bg-lime-400/[0.10] text-lime-400",
            "shadow-[0_0_18px_-4px_rgba(163,230,53,0.45)]",
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {item.label}
        </p>
        <p className="text-sm font-semibold leading-snug text-white">
          {item.value}
        </p>
      </div>
      <Link
        href={item.href}
        className="flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/[0.06] hover:text-cyan-200"
      >
        <PencilLine className="size-3" />
        Edit
        <ChevronRight className="size-3" />
      </Link>
    </div>
  );
}
