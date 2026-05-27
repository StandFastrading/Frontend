export function Callout({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-cyan-400/25 bg-[#0a1428]/80 p-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.12] text-cyan-300">
        <Icon className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs leading-relaxed text-slate-300">{text}</p>
      </div>
    </div>
  );
}
