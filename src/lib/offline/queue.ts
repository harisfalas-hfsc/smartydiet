/**
 * Queue for safe local mutations made while offline (read/unread, deletes).
 * Replayed automatically as soon as the connection returns.
 */
import { createStore, get, set } from "idb-keyval";
import { isOnlineNow } from "./connectivity";
import {
  deleteNotifications,
  deleteMyThreads,
  setNotificationsRead,
  setThreadsRead,
} from "@/lib/support.functions";


const store =
  typeof indexedDB !== "undefined" ? createStore("smartydiet-offline", "kv") : undefined;

export type QueuedMutation =
  | { id: string; kind: "notifications.setRead"; ids: string[]; read: boolean }
  | { id: string; kind: "notifications.delete"; ids: string[] }
  | { id: string; kind: "threads.setRead"; ids: string[]; read: boolean }
  | { id: string; kind: "threads.delete"; ids: string[] };

function queueKey(userId: string) {
  return `${userId}::mutation-queue`;
}

async function readQueue(userId: string): Promise<QueuedMutation[]> {
  if (!store) return [];
  try {
    return ((await get(queueKey(userId), store)) as QueuedMutation[] | undefined) ?? [];
  } catch {
    return [];
  }
}

async function writeQueue(userId: string, items: QueuedMutation[]) {
  if (!store) return;
  try {
    await set(queueKey(userId), items, store);
  } catch {
    /* noop */
  }
}

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

export async function enqueueMutation(
  userId: string,
  mutation: DistributiveOmit<QueuedMutation, "id"> & { id?: string },
) {
  const items = await readQueue(userId);
  items.push({ ...(mutation as QueuedMutation), id: mutation.id ?? crypto.randomUUID() });
  await writeQueue(userId, items);
}

async function run(mutation: QueuedMutation) {
  switch (mutation.kind) {
    case "notifications.setRead":
      await setNotificationsRead({ data: { ids: mutation.ids, read: mutation.read } });
      return;
    case "notifications.delete":
      await deleteNotifications({ data: { ids: mutation.ids } });
      return;
    case "threads.setRead":
      await setThreadsRead({ data: { ids: mutation.ids, read: mutation.read } });
      return;
    case "threads.delete":
      await deleteMyThreads({ data: { ids: mutation.ids } });
      return;
  }
}

let flushing = false;

/** Replays every queued mutation. Failed items stay queued for the next attempt. */
export async function flushQueue(userId: string): Promise<number> {
  if (flushing || !isOnlineNow()) return 0;
  flushing = true;
  try {
    const items = await readQueue(userId);
    if (!items.length) return 0;
    const remaining: QueuedMutation[] = [];
    let done = 0;
    for (const item of items) {
      try {
        await run(item);
        done += 1;
      } catch {
        remaining.push(item);
      }
    }
    await writeQueue(userId, remaining);
    return done;
  } finally {
    flushing = false;
  }
}
