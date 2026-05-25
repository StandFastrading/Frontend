"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, HelpCircle, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";
import { STEPS, getStepBySlug } from "@/features/onboarding/steps";

export default function StepsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const slug = pathname.split("/").pop() ?? "";
  const current = getStepBySlug(slug);
  const currentNum = current?.num ?? 1;

  return (
    <div className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="hidden flex-col gap-8 border-r border-white/[0.06] bg-[#070c1a]/95 p-6 lg:flex">
        <div className="flex items-center">
          <Image
            src="/standfast-logo.svg"
            alt="StandFast Technologies"
            width={170}
            height={48}
            priority
          />
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
            Onboarding
          </p>
          <ol className="flex flex-col gap-1">
            {STEPS.map((step) => {
              const isCurrent = step.slug === slug;
              const isDone = step.num < currentNum;
              return (
                <li key={step.slug}>
                  <Link
                    href={`/onboarding/${step.slug}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                      isCurrent
                        ? "bg-white/[0.06]"
                        : "hover:bg-white/[0.04]",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-6 shrink-0 text-lime-400" />
                    ) : (
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                          isCurrent
                            ? "border-cyan-400 text-cyan-400"
                            : "border-slate-700 text-slate-500 group-hover:border-slate-500",
                        )}
                      >
                        {step.num}
                      </div>
                    )}
                    <span
                      className={cn(
                        "text-sm transition-colors",
                        isCurrent
                          ? "font-semibold text-white"
                          : isDone
                            ? "text-slate-200 hover:text-white"
                            : "text-slate-400 hover:text-slate-200",
                      )}
                    >
                      {step.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400">
            <HelpCircle className="size-4" />
            {current?.whyTitle ?? "Why we ask"}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            {current?.whyText ?? ""}
          </p>
        </div>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center justify-end px-6 pt-6 lg:px-12 lg:pt-8">
          <Link href={ROUTES.dashboard}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-white/[0.08] bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="size-4" />
              Save &amp; Exit
            </Button>
          </Link>
        </header>
        <main className="flex flex-1 flex-col px-6 pb-10 pt-8 lg:px-12 lg:pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
