"use client";

import { useState, type ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import type { WaitlistVariant } from "../schemas";
import { WaitlistForm } from "./waitlist-form";

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

type WaitlistTriggerProps = {
  variant?: WaitlistVariant;
  buttonVariant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

const COPY: Record<
  WaitlistVariant,
  { title: string; description: string }
> = {
  beta: {
    title: "Request beta access",
    description:
      "Drop your email — we'll let you know as soon as you're in.",
  },
  launch: {
    title: "Get notified when the demo is live",
    description:
      "Same list. We'll ping you the moment the demo drops.",
  },
};

export function WaitlistTrigger({
  variant = "beta",
  buttonVariant = "default",
  className,
  children,
}: WaitlistTriggerProps) {
  const [open, setOpen] = useState(false);
  const { title, description } = COPY[variant];

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        className={cn(className)}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <WaitlistForm
            variant={variant}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
