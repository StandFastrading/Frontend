import { AccountTabs } from "@/features/account/components/account-tabs";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground">Profile and security settings.</p>
      </header>
      <AccountTabs />
      <div>{children}</div>
    </div>
  );
}
