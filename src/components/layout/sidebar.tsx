"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Lucide from "lucide-react";
import { ArrowRight, ChevronUp, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { dashboardNav } from "@/config/nav";
import { ROUTES } from "@/config/routes";
import {
  clearAllMockData,
  clearMockSession,
} from "@/features/auth/mock-session";
import { cn } from "@/lib/utils";

const iconMap = Lucide as unknown as Record<
  string,
  React.ComponentType<{ className?: string }>
>;

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = (email || "ST").slice(0, 2).toUpperCase();

  // Sign-out: clears the mock session cookie only. Onboarded flag is kept so
  // returning users go straight to /dashboard after their next sign-in. When
  // real Supabase auth lands, call supabase.auth.signOut() here too.
  const handleSignOut = () => {
    clearMockSession();
    toast.success("Signed out");
    router.replace(ROUTES.login);
    router.refresh();
  };

  // Dev-only: full demo wipe. Confirms first because it's destructive
  // (deletes saved Rules & Risk settings + decision log).
  const handleResetDemo = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Reset all demo data?\n\nThis clears your session, onboarding state, saved Rules & Risk settings, and decision log. You'll be sent back to /login as a brand-new user.",
      )
    ) {
      return;
    }
    clearAllMockData();
    toast.success("Demo data cleared");
    router.replace(ROUTES.login);
    router.refresh();
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 p-4 pb-14 backdrop-blur md:flex">
      {/* Brand */}
      <Link
        href={ROUTES.home}
        className="mb-6 flex items-center gap-2.5 px-2"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/30">
          <ShieldCheck className="size-5" />
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
                  ? "bg-brand/15 text-brand ring-1 ring-brand/30"
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

      {/* Enter Trade Desk CTA */}
      <div className="my-4 flex flex-col gap-3 rounded-xl border border-white/15 bg-background/40 p-4">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Enter Trade Desk
        </span>
        <p className="text-xs leading-relaxed text-foreground/75">
          Move to the live trading environment to execute, scan, and monitor
          markets.
        </p>
        <Link
          href={ROUTES.desk}
          className="flex items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
        >
          Enter Trade Desk
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

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
          <DropdownMenuItem
            onClick={handleResetDemo}
            className="text-rose-400 focus:text-rose-300"
          >
            Reset Demo Data
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}
