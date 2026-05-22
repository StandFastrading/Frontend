"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/config/routes";
import { signOut } from "@/features/auth/api";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const initials = email.slice(0, 2).toUpperCase();

  const mutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      router.replace(ROUTES.login);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not sign out");
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar className="size-8">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(ROUTES.account)}>
          Account
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
