"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

import { betaEntrySchema, type BetaEntryInput } from "../schemas";
import { betaEntry } from "../api";

const fieldClass =
  "h-11 border-white/15 bg-input/40 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:border-brand focus-visible:ring-brand/30";

export function BetaEntryForm() {
  const router = useRouter();

  const form = useForm<BetaEntryInput>({
    resolver: zodResolver(betaEntrySchema),
    defaultValues: {
      email: "",
      accessCode: "",
    },
  });

  const mutation = useMutation({
    mutationFn: betaEntry,
    onSuccess: () => {
      // Session is set in betaEntry(); middleware routes onboarded testers to
      // the dashboard and everyone else into onboarding.
      router.replace(ROUTES.dashboard);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not verify your beta access");
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
        <Label htmlFor="accessCode" className="text-foreground/80">
          Access code
        </Label>
        <Input
          id="accessCode"
          autoComplete="off"
          placeholder="From your invite email"
          {...form.register("accessCode")}
          className={fieldClass}
        />
        {form.formState.errors.accessCode && (
          <p className="text-xs text-destructive">
            {form.formState.errors.accessCode.message}
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
        {mutation.isPending ? "Verifying..." : "Enter StandFast"}
        {!mutation.isPending && <ArrowRight />}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Use the email and access code from your beta invite.
      </p>
    </form>
  );
}
