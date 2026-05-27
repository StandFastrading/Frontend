"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DailyReflectionTab } from "@/features/journal/components/daily-reflection-tab";
import { NotesTab } from "@/features/journal/components/notes-tab";
import { ReflectionHistoryTab } from "@/features/journal/components/reflection-history-tab";
import { TradesTab } from "@/features/journal/components/trades-tab";

// Behavioral Journal page. Four tabs:
//   * Trades              chronological closed-trade history with
//                         behavior tags (mistake / deviation count).
//   * Daily Reflection    auto-generated session summary + six guided
//                         reflection prompts + behavioral insight +
//                         tomorrow focus.
//   * Reflection History  prior saved reflections with state / score
//                         / cluster filters.
//   * Notes               freeform notes, categorized.
//
// Default tab = "trades". Tabs are local state — no URL deep-linking
// for V1.

type JournalTabValue = "trades" | "reflection" | "history" | "notes";

export function JournalPage() {
  const [tab, setTab] = useState<JournalTabValue>("trades");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Journal
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Behavioral Journal
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Trade records, daily reflection, and behavioral observations.
          Behavior compounds — this is where the loop closes.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as JournalTabValue)}
        className="gap-5"
      >
        <TabsList variant="line" className="self-start">
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="reflection">Daily Reflection</TabsTrigger>
          <TabsTrigger value="history">Reflection History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="trades">
          <TradesTab />
        </TabsContent>
        <TabsContent value="reflection">
          <DailyReflectionTab />
        </TabsContent>
        <TabsContent value="history">
          <ReflectionHistoryTab />
        </TabsContent>
        <TabsContent value="notes">
          <NotesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
