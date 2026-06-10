"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Lucide from "lucide-react";
import { AlertTriangle, ArrowRight, ChevronUp, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SyncStatusChip } from "@/components/layout/sync-status-chip";
import { dashboardNav } from "@/config/nav";
import { ROUTES } from "@/config/routes";
import { signOut } from "@/features/auth/api";
import { clearLocalCache } from "@/lib/auth/clear-local-cache";
import { factoryResetTestData } from "@/lib/storage";
import { resetAppState, useAppStore } from "@/store";
import { cn } from "@/lib/utils";

const iconMap = Lucide as unknown as Record<
  string,
  React.ComponentType<{ className?: string }>
>;

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = (email || "ST").slice(0, 2).toUpperCase();
  const resetTodaysSession = useAppStore((s) => s.resetTodaysSession);
  const [factoryResetOpen, setFactoryResetOpen] = useState(false);

  // Sign-out: end the Supabase session AND wipe local cache. Wiping the cache
  // is what prevents user A's trades/journal from being visible to user B on
  // the same browser. `clearLocalCache` sweeps every sf_* localStorage key
  // and resets the in-memory zustand store.
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Even if Supabase signOut fails (e.g. flaky network), still clear the
      // local cache — the safety property is more important than a tidy
      // server-side log-out.
    }
    clearLocalCache();
    toast.success("Signed out");
    router.replace(ROUTES.auth);
    router.refresh();
  };

  // [TEMPORARY · DEV-ONLY] Reset today's session data only — for testing
  // the Behavioral State Aggregator from a clean baseline. Preserves user
  // profile, onboarding, risk rules, allowed setups, and prior-day
  // history. Remove this menu entry before shipping.
  const handleResetTodaysSession = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Reset today's session data?\n\nThis clears today's active trades, behavior events, monitoring events, interventions, and closed trades, then starts a fresh session.\n\nPreserved: user profile, onboarding, risk rules, allowed setups, prior-day history.",
      )
    ) {
      return;
    }
    resetTodaysSession();
    toast.success("Today's session reset — clean baseline");
    router.refresh();
  };

  // Dev-only: heavier "reset everything local" affordance. Equivalent to a
  // sign-out: ends the Supabase session and wipes every sf_* localStorage
  // key. Server-side rows in Supabase are untouched — to delete those, use
  // a future "Delete my account" action that drops the auth user (RLS
  // cascades clean up the rest).
  const handleResetDemo = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Reset local data?\n\nThis signs you out and wipes every local cache key on this browser. Your server-side data on Supabase is preserved.",
      )
    ) {
      return;
    }
    try {
      await signOut();
    } catch {
      /* still clear cache below */
    }
    clearLocalCache();
    toast.success("Local cache cleared");
    router.replace(ROUTES.auth);
    router.refresh();
  };

  // Dev-only: factory reset for test data. Unlike Reset Local Data, this
  // does NOT sign the user out — the Supabase session stays active so the
  // trader lands back on /dashboard with an empty local cache. Sweeps every
  // localStorage key under the `sf_` prefix and resets the in-memory zustand
  // state so the dashboard re-renders empty without waiting for a full page
  // reload.
  const handleFactoryReset = () => {
    const removed = factoryResetTestData();
    // Reset the in-memory store too — `factoryResetTestData` only
    // touches localStorage, but the zustand module is a long-lived
    // singleton holding the same data in memory. Without this, the
    // dashboard would keep showing the cached trades until the next
    // hard reload.
    resetAppState();
    // Re-bootstrap a session-for-today. `resetAppState` resets the
    // store to its initial defaults (`activeSessionId: null`,
    // `sessions: []`), and the boundary-system callback that normally
    // opens a session only runs inside `onRehydrateStorage` — NOT
    // after a manual setState. Without this call, the next activation
    // would build a trade that `stampWithActiveSession` can't stamp,
    // so Active Trade Monitoring would render its empty state forever.
    useAppStore.getState().ensureSessionForToday();
    console.log(
      `[factory-reset] cleared ${removed.length} localStorage key${
        removed.length === 1 ? "" : "s"
      }:`,
      removed,
    );
    toast.success("Factory reset complete — all test data cleared");
    setFactoryResetOpen(false);
    router.replace(ROUTES.dashboard);
    router.refresh();
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 p-4 pb-14 backdrop-blur md:flex">
      {/* Brand */}
      <Link
        href={ROUTES.home}
        className="mb-6 flex items-center gap-2.5 px-2"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand/20 text-brand ring-1 ring-brand/45 shadow-[0_0_18px_-4px_oklch(0.62_0.22_255/0.55)]">
          <ShieldCheck className="size-5 drop-shadow-[0_0_6px_oklch(0.62_0.22_255/0.55)]" />
        </span>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold uppercase tracking-wider text-foreground">
            Standfast
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
            Technologies
          </span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {dashboardNav.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            item.href !== "#" &&
            (pathname === item.href || pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                isActive
                  ? "bg-gradient-to-r from-brand/25 to-brand/10 text-brand ring-1 ring-brand/45 shadow-[0_0_20px_-6px_oklch(0.62_0.22_255/0.55)]"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
              )}
            >
              {Icon ? <Icon className="size-4" /> : null}
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sync status — ambient indicator of pending/errored server writes.
          Only visible when there's something to communicate; silent during
          normal "all synced" steady state. */}
      <SyncStatusChip />

      {/* Trade Desk affordance — kept accessible at the bottom of the rail
          but visually quieted so behavior-awareness surfaces (the dashboard)
          stay dominant. Reads as a pinned utility link, not a hero CTA. */}
      <Link
        href={ROUTES.desk}
        className="my-3 flex items-center justify-between gap-2 rounded-md border border-white/10 bg-background/20 px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-white/20 hover:bg-foreground/[0.04] hover:text-foreground"
      >
        <span className="text-[0.7rem] uppercase tracking-[0.16em]">
          Enter Trade Desk
        </span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
      </Link>

      {/* User profile — wrapped in a bordered card so it reads as StandFast
          UI (the Next.js dev overlay's "N" button floats at bottom-left of
          the viewport and used to be the only thing visible here). */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl border border-white/15 bg-background/40 p-2 text-left outline-none transition-colors hover:border-white/25 hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-brand/40">
          <Avatar className="size-9 ring-1 ring-brand/30">
            <AvatarFallback className="bg-brand/15 text-xs font-semibold text-brand">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">
              Trader
            </span>
            <span className="text-[0.65rem] text-muted-foreground">
              Pro Plan
            </span>
          </div>
          <ChevronUp className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top">
          {/* DropdownMenuLabel is a Base UI Menu.GroupLabel under the hood —
              it throws if not wrapped in a Menu.Group, hence the explicit
              DropdownMenuGroup here. Defensive `email || "Demo user"`
              prevents an empty label row. */}
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {email || "Demo user"}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(ROUTES.account)}>
            Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* [TEMPORARY · DEV-ONLY] Reset today's session data only.
              Used to validate the Behavioral State Aggregator from a
              clean baseline. Remove this entry before production. */}
          <DropdownMenuItem
            onClick={handleResetTodaysSession}
            className="text-amber-400 focus:text-amber-300"
          >
            DEV · Reset Today&rsquo;s Session
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleResetDemo}
            className="text-rose-400 focus:text-rose-300"
          >
            Reset Demo Data
          </DropdownMenuItem>
          {/* [TEMPORARY · DEV-ONLY] Factory reset for test data. Preserves
              auth + onboarded cookies so the trader stays on /dashboard
              instead of getting routed through onboarding again. Routes
              the destructive action through a real Dialog because the
              wipe is irreversible — `window.confirm` doesn't carry
              enough visual weight for this case. */}
          <DropdownMenuItem
            onClick={() => setFactoryResetOpen(true)}
            className="text-rose-400 focus:text-rose-300"
          >
            DEV · Factory Reset Test Data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={factoryResetOpen} onOpenChange={setFactoryResetOpen}>
        <DialogContent
          showCloseButton={false}
          className="dark flex max-w-md flex-col gap-5 border border-rose-500/40 bg-card/95 p-5 text-foreground shadow-[0_0_60px_-15px_rgba(244,63,94,0.45)] sm:max-w-md"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40 shadow-[0_0_18px_-4px_rgba(244,63,94,0.55)]">
              <AlertTriangle className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base font-semibold text-foreground">
                Factory Reset Test Data
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
                Factory Reset Test Data will permanently delete all local
                testing trades, behavior events, journal entries, reports,
                calendar records, and analytics. This cannot be undone.
              </DialogDescription>
            </div>
          </div>
          <div className="-mx-5 -mb-5 flex items-center justify-end gap-2 rounded-b-xl border-t border-white/10 bg-background/30 px-4 py-3">
            <button
              type="button"
              onClick={() => setFactoryResetOpen(false)}
              className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFactoryReset}
              className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-rose-950 transition-colors hover:bg-rose-500/90"
            >
              Factory Reset
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
