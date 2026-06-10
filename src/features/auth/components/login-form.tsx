"use client";

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

const fieldClass =
  "h-11 border-white/15 bg-input/40 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:border-brand focus-visible:ring-brand/30";

export function LoginForm({
  onSwitchToSignup,
}: {
  onSwitchToSignup?: () => void;
}) {
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
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-foreground/80">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...form.register("email")}
          className={fieldClass}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-foreground/80">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            {...form.register("password")}
            className={cn(fieldClass, "pr-10")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-brand"
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
          "mt-2 h-12 w-full bg-brand text-base font-semibold tracking-wide text-brand-foreground",
          "transition-colors hover:bg-brand/90",
          "disabled:opacity-50",
        )}
      >
        {mutation.isPending ? "Signing in..." : "Sign in"}
        {!mutation.isPending && <ArrowRight />}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold text-brand underline-offset-4 transition-colors hover:text-brand/80 hover:underline"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
