/**
 * Durable queue for safe local mutations made while offline
 * (read/unread flags, deletes). Replayed automatically once the backend is
 * reachable again. Every operation carries retry metadata so a permanently
 * failing item can never create an infinite retry loop or block the rest.
 */
import { createStore, get, set } from "idb-keyval";
import { isOnlineNow, reportRequestFailure, reportRequestSuccess } from "./connectivity";
import {
  deleteNotifications,
  deleteMyThreads,
  setNotificationsRead,
  setThreadsRead,
} from "@/lib/support.functions";
import { writeSyncMeta } from "./store";

const store =
  typeof indexedDB !== "undefined" ? createStore("smartydiet-offline", "kv") : undefined;

export const MAX_RETRIES = 6;

type Payload =
  | { kind: "notifications.setRead"; ids: string[]; read: boolean }
  | { kind: "notifications.delete"; ids: string[] }
  | { kind: "threads.setRead"; ids: string[]; read: boolean }
  | { kind: "threads.delete"; ids: string[] };

export type QueuedMutation = Payload & {
  id: string;
  createdAt: number;
  retries: number;
  status: "pending" | "failed";
  lastError: string | null;
  priority: number;
};

function queueKey(userId: string) {
  return `${userId}::mutation-queue`;
}

async function readQueue(userId: string): Promise<QueuedMutation[]> {
  if (!store) return [];
  try {
    const raw = ((await get(queueKey(userId), store)) as QueuedMutation[] | undefined) ?? [];
    // Tolerate items written by the previous (metadata-less) queue version.
    return raw.map((item) => ({
      createdAt: Date.now(),
      retries: 0,
      status: "pending",
      lastError: null,
      priority: 1,
      ...item,
    }));
  } catch {
    return [];
  }
}

async function writeQueue(userId: string, items: QueuedMutation[]) {
  if (!store) return;
  try {
    await set(queueKey(userId), items, store);
    await writeSyncMeta(userId, {
      pending: items.filter((i) => i.status === "pending").length,
      failed: items.filter((i) => i.status === "failed").length,
    });
  } catch {
    /* noop */
  }
}

export async function countPending(userId: string): Promise<number> {
  return (await readQueue(userId)).filter((i) => i.status === "pending").length;
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

export async function enqueueMutation(
  userId: string,
  mutation: DistributiveOmit<Payload, never> & { id?: string; priority?: number },
) {
  const items = await readQueue(userId);
  const id = mutation.id ?? crypto.randomUUID();
  if (items.some((i) => i.id === id)) return; // never duplicate
  items.push({
    ...(mutation as Payload),
    id,
    createdAt: Date.now(),
    retries: 0,
    status: "pending",
    lastError: null,
    priority: mutation.priority ?? 1,
  });
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

/**
 * Replays queued mutations oldest-first. Failures are retried on later flushes
 * and parked as `failed` after MAX_RETRIES so the queue always drains.
 */
export async function flushQueue(userId: string): Promise<number> {
  if (flushing || !isOnlineNow()) return 0;
  flushing = true;
  try {
    const items = await readQueue(userId);
    const pending = items
      .filter((i) => i.status === "pending")
      .sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
    if (!pending.length) return 0;

    const done = new Set<string>();
    for (const item of pending) {
      try {
        await run(item);
        reportRequestSuccess();
        done.add(item.id);
      } catch (error) {
        item.retries += 1;
        item.lastError = error instanceof Error ? error.message : "Unknown error";
        if (item.retries >= MAX_RETRIES) item.status = "failed";
        reportRequestFailure();
        if (!isOnlineNow()) break; // connection dropped mid-flush; keep the rest
      }
    }

    const remaining = items.filter((i) => !done.has(i.id));
    await writeQueue(userId, remaining);
    return done.size;
  } finally {
    flushing = false;
  }
}

/** Drops permanently-failed operations (user-triggered from diagnostics). */
export async function discardFailed(userId: string) {
  const items = await readQueue(userId);
  await writeQueue(
    userId,
    items.filter((i) => i.status !== "failed"),
  );
}
