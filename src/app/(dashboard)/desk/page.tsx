import { DeskHeader } from "@/features/desk/components/desk-header";
import { TradeDeskWorkspace } from "@/features/desk/components/trade-desk-workspace";

export default function TradeDeskPage() {
  return (
    <div className="flex flex-col gap-6">
      <DeskHeader />
      <TradeDeskWorkspace />
    </div>
  );
}
