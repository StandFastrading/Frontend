import type { Metadata } from "next";

import { StandfastLogo } from "@/components/ui/StandfastLogo";

export const metadata: Metadata = {
  title: "StandFast Technologies — Coming Soon",
  description:
    "Behavioral trading infrastructure for serious traders. Platform currently under development.",
};

export default function ComingSoonPage() {
  return (
    <main className="relative flex min-h-svh flex-1 flex-col items-center justify-center overflow-hidden bg-[#04060d] px-6 py-20">
      {/* Ambient cinematic backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(43,168,224,0.18),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-[radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.10),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
        {/* Logo with animated glow */}
        <div className="relative w-full max-w-md">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 animate-pulse bg-[radial-gradient(ellipse_at_center,rgba(43,168,224,0.45),transparent_65%)] blur-3xl [animation-duration:4.5s]"
          />
          <StandfastLogo glow className="mx-auto w-full" />
        </div>

        <h1 className="mt-14 text-balance text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.75rem]">
          Behavioral trading infrastructure for serious traders.
        </h1>

        <p className="mt-5 text-xs font-medium uppercase tracking-[0.35em] text-white/45 sm:text-sm">
          Platform currently under development.
        </p>

        <button
          type="button"
          aria-disabled
          className="group relative mt-14 inline-flex items-center justify-center overflow-hidden rounded-full border border-emerald-400/50 bg-emerald-500/[0.08] px-9 py-3.5 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 shadow-[0_0_30px_-6px_rgba(16,185,129,0.55),inset_0_0_24px_-12px_rgba(16,185,129,0.7)] transition-colors duration-300 hover:bg-emerald-500/[0.14] hover:text-emerald-200 sm:text-sm"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 animate-pulse rounded-full bg-emerald-500/25 blur-xl [animation-duration:3s]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-emerald-200/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]"
          />
          Coming Soon
        </button>
      </section>

      <footer className="relative z-10 mt-20 text-[0.65rem] uppercase tracking-[0.4em] text-white/30">
        © {new Date().getFullYear()} StandFast Technologies
      </footer>
    </main>
  );
}
