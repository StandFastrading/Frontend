"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { profileSchema, type ProfileInput } from "../schemas";
import { updateProfile } from "../api";

export function ProfileForm({
  defaultValues,
  email,
}: {
  defaultValues: ProfileInput;
  email: string;
}) {
  const router = useRouter();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (_data, vars) => {
      toast.success("Profile updated");
      form.reset(vars);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not update profile");
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          Email changes need re-verification — coming later.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          autoComplete="name"
          {...form.register("display_name")}
        />
        {form.formState.errors.display_name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.display_name.message}
          </p>
        )}
      </div>
      <div>
        <Button
          type="submit"
          disabled={mutation.isPending || !form.formState.isDirty}
        >
          {mutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
