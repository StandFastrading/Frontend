"use client";

import { useEffect, useRef } from "react";
import { hydrateFromServer, useAppStore } from "@/store";
import { flushSyncQueue } from "@/lib/sync";
import type { ServerSeedPayload } from "@/lib/sync/hydrate";
import { migrateLocalToServer } from "@/lib/sync/migrate-local-to-server";

// Mounts once at the top of the dashboard tree. Takes the server-fetched
// seed payload and overlays it on top of the zustand-persisted local cache.
// Server data wins. After hydration, replay any pending writes from the
// previous offline session, then run the one-shot localStorage → server
// migration if needed.
export function StoreHydrator({
  userId,
  seed,
  children,
}: {
  userId: string | null;
  seed: ServerSeedPayload;
  children: React.ReactNode;
}) {
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    useAppStore.getState()._setUserId(userId);
    hydrateFromServer(seed);
    flushSyncQueue();
    if (userId) {
      migrateLocalToServer(userId).catch((err) => {
        console.error("[hydrate] local→server migration failed", err);
      });
    }
  }, [userId, seed]);
  return <>{children}</>;
}
