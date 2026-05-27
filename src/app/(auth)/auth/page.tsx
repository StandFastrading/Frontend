"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";

import { LoginForm } from "@/features/auth/components/login-form";
import { SignupForm } from "@/features/auth/components/signup-form";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const isLogin = mode === "login";

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-8">
      <Image
        src="/standfast-logo.svg"
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
              {isLogin ? "Welcome" : "Get Started"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to continue to StandFast."
                : "Create your StandFast account."}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 gap-1 rounded-lg border border-white/15 bg-input/30 p-1"
          >
            <ModeTab
              active={isLogin}
              onClick={() => setMode("login")}
              label="Login"
            />
            <ModeTab
              active={!isLogin}
              onClick={() => setMode("signup")}
              label="Sign Up"
            />
          </div>

          <div className="mt-1">
            {isLogin ? (
              <Suspense fallback={null}>
                <LoginForm onSwitchToSignup={() => setMode("signup")} />
              </Suspense>
            ) : (
              <SignupForm onSwitchToLogin={() => setMode("login")} />
            )}
          </div>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Your data is private and secure
      </p>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-md text-sm font-semibold tracking-wide transition-colors",
        active
          ? "bg-brand text-brand-foreground shadow-sm"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
