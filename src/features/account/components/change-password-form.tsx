"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { changePasswordSchema, type ChangePasswordInput } from "../schemas";
import { changePassword } from "../api";

export function ChangePasswordForm() {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (v: ChangePasswordInput) => changePassword(v.newPassword),
    onSuccess: () => {
      toast.success("Password updated");
      form.reset({ newPassword: "", confirmPassword: "" });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not update password");
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...form.register("newPassword")}
        />
        {form.formState.errors.newPassword && (
          <p className="text-xs text-destructive">
            {form.formState.errors.newPassword.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
        />
        {form.formState.errors.confirmPassword && (
          <p className="text-xs text-destructive">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>
      <div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Updating..." : "Update password"}
        </Button>
      </div>
    </form>
  );
}
