"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, CreditCard, Gift, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

import { signupSchema, type SignupInput } from "../schemas";
import { signUpWithPassword } from "../api";
import { setMockSession } from "../mock-session";

const fieldClass =
  "h-11 border-cyan-500/20 bg-[#0a1020] text-base text-white placeholder:text-slate-600 focus-visible:border-cyan-400 focus-visible:ring-cyan-400/30";

export function SignupForm() {
  const router = useRouter();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      paymentMethod: "card",
      cardNumber: "",
      expiry: "",
      cvc: "",
      zip: "",
      trialCode: "",
    },
  });

  const paymentMethod = form.watch("paymentMethod");

  function switchTo(method: "card" | "trial") {
    form.setValue("paymentMethod", method);
    form.clearErrors([
      "cardNumber",
      "expiry",
      "cvc",
      "zip",
      "trialCode",
    ]);
  }

  const mutation = useMutation({
    mutationFn: async (input: SignupInput) => {
      console.log("[signup] full payload", input);
      return signUpWithPassword({
        email: input.email,
        password: input.password,
        fullName: input.fullName,
      });
    },
    onSuccess: (_data, vars) => {
      setSubmittedEmail(vars.email);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not create account");
    },
  });

  if (submittedEmail) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/[0.10] text-cyan-300">
          <Mail className="size-5" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-white">Check your inbox</p>
          <p className="text-sm text-slate-300">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-cyan-300">
              {submittedEmail}
            </span>
            . Open it to finish setting up your account.
          </p>
        </div>
        <Link
          href={ROUTES.login}
          className="text-sm font-semibold text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Mock-mode signup: set session cookie and go straight to onboarding.
        setMockSession();
        router.push(ROUTES.onboarding);
        router.refresh();
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName" className="text-slate-300">
          Full name
        </Label>
        <Input
          id="fullName"
          autoComplete="name"
          placeholder="Alex Morgan"
          {...form.register("fullName")}
          className={fieldClass}
        />
        {form.formState.errors.fullName && (
          <p className="text-xs text-destructive">
            {form.formState.errors.fullName.message}
          </p>
        )}
      </div>

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
          className={fieldClass}
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
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          {...form.register("password")}
          className={fieldClass}
        />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          {paymentMethod === "trial" ? "Trial Code" : "Payment"}
        </span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      {paymentMethod === "card" ? (
        <div className="flex flex-col gap-4 duration-200 animate-in fade-in slide-in-from-top-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cardNumber" className="text-slate-300">
              Card number
            </Label>
            <div className="relative">
              <Input
                id="cardNumber"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 5678 9012 3456"
                {...form.register("cardNumber")}
                className={cn(fieldClass, "pr-10")}
              />
              <CreditCard className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            </div>
            {form.formState.errors.cardNumber && (
              <p className="text-xs text-destructive">
                {form.formState.errors.cardNumber.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="expiry" className="text-slate-300">
                Expiry
              </Label>
              <Input
                id="expiry"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                {...form.register("expiry")}
                className={fieldClass}
              />
              {form.formState.errors.expiry && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.expiry.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cvc" className="text-slate-300">
                CVC
              </Label>
              <Input
                id="cvc"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
                {...form.register("cvc")}
                className={fieldClass}
              />
              {form.formState.errors.cvc && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.cvc.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="zip" className="text-slate-300">
              ZIP / Postal code
            </Label>
            <Input
              id="zip"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="10001"
              {...form.register("zip")}
              className={fieldClass}
            />
            {form.formState.errors.zip && (
              <p className="text-xs text-destructive">
                {form.formState.errors.zip.message}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => switchTo("trial")}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            <Gift className="size-3.5" />
            I have a trial code
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 duration-200 animate-in fade-in slide-in-from-top-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="trialCode" className="text-slate-300">
              Trial code
            </Label>
            <div className="relative">
              <Input
                id="trialCode"
                autoComplete="off"
                placeholder="STANDFAST-TRIAL-2026"
                {...form.register("trialCode")}
                className={cn(fieldClass, "pr-10 font-mono tracking-wide")}
              />
              <Gift className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-lime-400/80" />
            </div>
            {form.formState.errors.trialCode && (
              <p className="text-xs text-destructive">
                {form.formState.errors.trialCode.message}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              No card required. We&apos;ll prompt for payment when your trial
              ends.
            </p>
          </div>

          <button
            type="button"
            onClick={() => switchTo("card")}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
          >
            <CreditCard className="size-3.5" />
            Use card instead
          </button>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className={cn(
          "mt-2 h-12 w-full text-base font-semibold tracking-wide text-lime-950",
          "bg-gradient-to-r from-lime-400 to-lime-500",
          "shadow-[0_0_30px_-5px_rgba(132,204,22,0.5)]",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:from-lime-300 hover:to-lime-400 hover:shadow-[0_0_45px_-5px_rgba(132,204,22,0.65)]",
          "disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none",
        )}
      >
        {mutation.isPending
          ? "Creating account..."
          : paymentMethod === "trial"
            ? "Start free trial"
            : "Create account"}
        {!mutation.isPending && <ArrowRight />}
      </Button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          href={ROUTES.login}
          className="font-semibold text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
