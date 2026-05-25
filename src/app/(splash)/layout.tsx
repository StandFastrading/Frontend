export default function SplashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark flex flex-1 flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
