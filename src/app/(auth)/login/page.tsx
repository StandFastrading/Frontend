import Image from "next/image";
import { Lock } from "lucide-react";

import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-8">
      <Image
        src="/standfast-logo.svg"
        alt="StandFast Technologies"
        width={280}
        height={80}
        priority
      />

      <div className="w-full rounded-2xl border border-cyan-500/15 bg-[#0c1326]/80 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-tight text-white">
            Welcome
          </h1>
          <p className="text-sm text-slate-400">
            Sign in to continue to StandFast.
          </p>
        </div>

        <div className="mt-7">
          <LoginForm />
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Lock className="size-3" />
        Your data is private and secure
      </p>
    </div>
  );
}
