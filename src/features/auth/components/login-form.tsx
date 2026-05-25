"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

import { loginSchema, type LoginInput } from "../schemas";
import { signInWithPassword } from "../api";
import { setMockSession } from "../mock-session";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? ROUTES.dashboard;
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: signInWithPassword,
    onSuccess: () => {
      router.replace(next);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not sign in");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Mock-mode login: set session cookie so middleware grants access,
        // then send the user to `next` (or dashboard). Middleware will route
        // to /onboarding if they haven't completed it yet.
        setMockSession();
        router.push(next);
        router.refresh();
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-slate-300">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...form.register("email")}
          className="h-11 border-cyan-500/20 bg-[#0a1020] text-base text-white placeholder:text-slate-600 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30"
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-slate-300">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            {...form.register("password")}
            className="h-11 border-cyan-500/20 bg-[#0a1020] pr-10 text-base text-white placeholder:text-slate-600 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-cyan-300"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={mutation.isPending}
        className={cn(
          "mt-2 h-12 w-full text-base font-semibold tracking-wide text-lime-950",
          "bg-gradient-to-r from-lime-400 to-lime-500",
          "shadow-[0_0_30px_-5px_rgba(132,204,22,0.5)]",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:from-lime-300 hover:to-lime-400 hover:shadow-[0_0_45px_-5px_rgba(132,204,22,0.65)]",
          "disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none",
        )}
      >
        {mutation.isPending ? "Signing in..." : "Sign in"}
        {!mutation.isPending && <ArrowRight />}
      </Button>

      <p className="text-center text-sm text-slate-400">
        No account?{" "}
        <Link
          href={ROUTES.signup}
          className="font-semibold text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
