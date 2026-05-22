import { UserMenu } from "./user-menu";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b px-6">
      <UserMenu email={email} />
    </header>
  );
}
