"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ROUTES } from "@/config/routes";
import { DisciplineEngineSequence } from "@/features/onboarding/components/discipline-engine-sequence";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { flushSyncQueueAsync } from "@/lib/sync";
import { useAppStore } from "@/store";

// Onboarding completion experience. The cinematic Discipline Engine
// sequence IS the page — it dominates the viewport while the system
// "calibrates" around the trader and reveals the official StandFast
// mark as the final lock-in moment. AUTO_REDIRECT_DELAY_MS after the
// sequence reports `online` we auto-navigate to the dashboard. There
// is intentionally nothing below the hero — the wrapper is locked to
// viewport height with overflow hidden so the user can't scroll into
// empty space.

const AUTO_REDIRECT_DELAY_MS = 3000;

export function CompletePage() {
  const router = useRouter();
  const [systemOnline, setSystemOnline] = useState(false);
  const [entering, setEntering] = useState(false);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const handleEnterDashboard = useCallback(async () => {
    if (entering) return;
    setEntering(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(ROUTES.auth);
        return;
      }

      // 0. Mark the store complete FIRST. Otherwise the local→server migration
      // (and any other profile upsert) replays a profiles row built from the
      // stale store with onboarding_complete=false, clobbering the true value
      // we set below and bouncing the user back to /onboarding.
      completeOnboarding();

      // 1. Drain all pending onboarding writes (account size, setups, profile,
      // etc.) FIRST. These carry the store's onboarding_complete=false; flushing
      // them now — before we set the completion flags below — guarantees a
      // late-replaying profiles upsert can't clobber the true value back to
      // false. It also ensures onboarding data is on the server before the
      // dashboard hydrates (otherwise hydration overwrites it with defaults).
      await flushSyncQueueAsync();

      const completedAt = new Date().toISOString();
      // 2. Mirror onboarding_complete into auth user_metadata so middleware can
      // read it cheaply on every request. profiles is the durable source of
      // truth; user_metadata is the cache.
      const [metaResult, profileResult] = await Promise.all([
        supabase.auth.updateUser({
          data: { onboarding_complete: true },
        }),
        supabase
          .from("profiles")
          .update({
            onboarding_complete: true,
            onboarding_completed_at: completedAt,
          })
          .eq("id", user.id),
      ]);
      if (metaResult.error) throw metaResult.error;
      if (profileResult.error) throw profileResult.error;

      // 3. Re-issue the session token so the freshly-set onboarding_complete
      // metadata is baked into the JWT/cookies the middleware validates on the
      // next request — otherwise the dashboard route bounces back to onboarding.
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;

      // 4. Navigate to the dashboard.
      router.push(ROUTES.dashboard);
      router.refresh();
    } catch (err) {
      setEntering(false);
      toast.error((err as Error).message || "Could not complete onboarding");
    }
  }, [entering, router, completeOnboarding]);

  // Stable callback so the sequence's reveal effect (whose deps include
  // this prop) doesn't tear down + re-attach on every CompletePage render.
  const handleOnline = useCallback(() => setSystemOnline(true), []);

  // Auto-redirect to the dashboard once the calibration sequence reports
  // online — the trader shouldn't have to scroll past the hero and click
  // the CTA themselves. Held in a ref so the timer is scheduled exactly
  // once when `systemOnline` flips true, and isn't re-scheduled when
  // `handleEnterDashboard`'s identity changes (it flips after the entry
  // call sets `entering: true`).
  const enterDashboardRef = useRef(handleEnterDashboard);
  enterDashboardRef.current = handleEnterDashboard;
  useEffect(() => {
    if (!systemOnline) return;
    const timer = setTimeout(() => {
      void enterDashboardRef.current();
    }, AUTO_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [systemOnline]);

  return (
    <div className="relative flex h-screen flex-col items-center overflow-hidden px-6 py-10">
      {/* Hero — the cinematic calibration sequence. Keeps a generous
          vertical envelope so the lock-in moment lands as a full-attention
          event, then collapses into the summary stack below. Sits on top
          of the very faint BackgroundMark, which makes the whole sequence
          feel built INSIDE the StandFast framework rather than presented
          against an empty backdrop. */}
      <section className="relative flex w-full max-w-3xl flex-col items-center gap-6 pb-10">
        <BackgroundMark />
        {/* Hero content sits in its own stacking context so the absolutely
            positioned BackgroundMark stays behind it without resorting to
            negative z-indexes that could escape the page wrapper. */}
        <div className="relative z-10 flex w-full flex-col items-center gap-6">
          <header className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Step 9 of 9 · Calibration
            </p>
            <h1 className="font-heading text-3xl font-bold leading-[1.05] tracking-tight text-white sm:text-4xl">
              Building Your Discipline Engine
              <span className="text-lime-400">.</span>
            </h1>
          </header>

          <DisciplineEngineSequence onOnline={handleOnline} />
        </div>
      </section>

    </div>
  );
}

// Massive faint StandFast mark anchored behind the calibration sequence.
// Renders the official cross glyph (same gradients/colors as the canonical
// /public/logo/standfast-logo.svg) at very low opacity with a slow
// ambient breathe + drop-shadow pulse — communicates "this system is
// being constructed inside the StandFast framework" without ever
// competing with the foreground animation. The inline SVG keeps the
// breathing animation cleanly composable with the parent layout.
function BackgroundMark() {
  // Two stacked layers, each animating ONLY opacity:
  //   1. The mark itself with a single static drop-shadow filter — no
  //      filter animation, just compositor-cheap opacity breathing.
  //   2. A sibling radial-gradient halo whose opacity oscillates on a
  //      separate timer to simulate the glow swell without recomputing
  //      a 100px-radius drop-shadow on a 1200px-wide element every frame.
  //
  // Pre-perf-pass this used to animate `filter: drop-shadow` from 50px
  // to 110px radius on the mark itself, which was forcing the browser
  // to repaint a huge translucent region 60×/sec. Splitting glow into a
  // separate breathing div keeps the same visual feel at a fraction of
  // the cost.
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="sf-bg-halo absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(43,168,224,0.12) 0%, rgba(43,168,224,0.04) 38%, transparent 72%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 300 130"
          className="sf-bg-mark h-auto w-[140%] max-w-[1200px]"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label=""
        >
          <defs>
            <linearGradient id="sf-bg-mark-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#C8CCD0" stopOpacity="0" />
              <stop offset="0.45" stopColor="#C8CCD0" stopOpacity="0.55" />
              <stop offset="1" stopColor="#D8DCE0" stopOpacity="1" />
            </linearGradient>
          </defs>
          <rect
            x="10"
            y="48"
            width="140"
            height="14"
            fill="url(#sf-bg-mark-fade)"
          />
          <rect x="150" y="48" width="140" height="14" fill="#2BA8E0" />
          <rect x="142" y="10" width="16" height="110" fill="#2BA8E0" />
        </svg>
      </div>
      <style jsx>{`
        :global(.sf-bg-mark) {
          /* Static glow — applied once, never animated. */
          opacity: 0.12;
          filter: drop-shadow(0 0 40px rgba(43, 168, 224, 0.08));
          will-change: opacity;
          animation: sf-bg-mark-breathe 22s ease-in-out infinite;
        }
        @keyframes sf-bg-mark-breathe {
          0%,
          100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.15;
          }
        }
        :global(.sf-bg-halo) {
          opacity: 0.7;
          will-change: opacity;
          animation: sf-bg-halo-breathe 22s ease-in-out infinite;
        }
        @keyframes sf-bg-halo-breathe {
          0%,
          100% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

