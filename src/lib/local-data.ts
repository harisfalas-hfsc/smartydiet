/**
 * Wipes every trace of the previous account from this device.
 *
 * SmartyDiet has no offline mode: nothing user-specific may survive a sign-out
 * or an account deletion. This clears localStorage, sessionStorage, IndexedDB
 * and any Cache Storage entries left behind by older builds.
 */
export async function clearLocalAppData(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }

  try {
    const anyIdb = indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string }>>;
    };
    const dbs = anyIdb.databases ? await anyIdb.databases() : [];
    await Promise.all(
      dbs
        .map((db) => db.name)
        .filter((name): name is string => Boolean(name))
        .map(
          (name) =>
            new Promise<void>((resolve) => {
              const req = indexedDB.deleteDatabase(name);
              req.onsuccess = req.onerror = req.onblocked = () => resolve();
            }),
        ),
    );
  } catch {
    /* ignore */
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }
}
