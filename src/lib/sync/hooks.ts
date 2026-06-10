"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSyncSnapshot,
  getSyncSnapshot,
  subscribeSyncQueue,
  type QueueSnapshot,
} from "./queue";

// Subscribes a React component to the sync queue's state. Returns the
// current snapshot — pending count, errored count, last success timestamp.
//
// Both snapshot getters return cached, stable references — required by
// React 18's `useSyncExternalStore` contract. A fresh object every call
// would trip the "getSnapshot should be cached" infinite-loop warning.
export function useSyncStatus(): QueueSnapshot {
  return useSyncExternalStore(
    subscribeSyncQueue,
    getSyncSnapshot,
    getServerSyncSnapshot,
  );
}
