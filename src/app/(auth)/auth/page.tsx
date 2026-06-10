import Image from "next/image";
import { Lock } from "lucide-react";

import { BetaEntryForm } from "@/features/auth/components/beta-entry-form";

export default function AuthPage() {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-8">
      <Image
        src="/logo/standfast-logo.svg"
        alt="StandFast Technologies"
        width={280}
        height={80}
        priority
      />

      <div className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-card/60 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/[0.05] via-brand/[0.02] to-transparent opacity-90"
        />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight text-foreground">
              Beta Test Entry
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter with the email and access code from your invite.
            </p>
          </div>

          <BetaEntryForm />
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Your data is private and secure
      </p>
    </div>
  );
}
