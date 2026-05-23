"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  waitlistSchema,
  type WaitlistInput,
  type WaitlistVariant,
} from "../schemas";

type WaitlistFormProps = {
  variant: WaitlistVariant;
  onSuccess: () => void;
};

const SUBMIT_LABEL: Record<WaitlistVariant, string> = {
  beta: "Request access",
  launch: "Notify me",
};

export function WaitlistForm({ variant, onSuccess }: WaitlistFormProps) {
  const [pending, setPending] = useState(false);
  const form = useForm<WaitlistInput>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: WaitlistInput) => {
    setPending(true);
    // TODO: persist via @/lib/supabase/client.ts — insert into `waitlist`
    // ({ email: values.email, source: variant }). Stubbed for this session.
    void values;
    await new Promise((resolve) => setTimeout(resolve, 600));
    setPending(false);
    toast.success("Thanks — we'll be in touch.");
    form.reset();
    onSuccess();
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="waitlist-email">Email</Label>
        <Input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending} className="h-10">
        {pending ? "Joining…" : SUBMIT_LABEL[variant]}
      </Button>
    </form>
  );
}
