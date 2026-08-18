import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOfflineSession } from "@/lib/offline/credentials";
import { OFFLINE_KEYS, readCached, saveLocal } from "@/lib/offline/store";

export const FREE_ACCESS_SETTING_KEY = "free_access_mode";

let cached: boolean | null = null;
let inFlight: Promise<boolean> | null = null;
const subscribers = new Set<(value: boolean) => void>();

function notify(value: boolean) {
  cached = value;
  for (const fn of subscribers) fn(value);
}

/** Push a new value to every listener instantly (used by the admin toggle). */
export function setFreeAccessModeCache(value: boolean) {
  notify(value);
}

/** Reads the global free-access switch. Fails closed (false = normal paid mode). */
export async function fetchFreeAccessMode(force = false): Promise<boolean> {
  if (!force && cached !== null) return cached;
  if (!force && inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", FREE_ACCESS_SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      const value = data?.setting_value === true;
      const uid = getOfflineSession()?.user.id;
      if (uid) void saveLocal(OFFLINE_KEYS.freeAccess, uid, value);
      return value;
    } catch {
      // Offline / failure: fall back to the last known value for this member.
      const uid = getOfflineSession()?.user.id;
      if (uid) {
        const stored = await readCached<boolean>(OFFLINE_KEYS.freeAccess, uid);
        if (typeof stored === "boolean") return stored;
      }
      return false;
    } finally {
      inFlight = null;
    }
  })();

  const value = await inFlight;
  notify(value);
  return value;
}

export function useFreeAccessMode(): { freeAccessMode: boolean; loading: boolean } {
  const [freeAccessMode, setValue] = useState<boolean>(cached ?? false);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    let active = true;
    const sub = (v: boolean) => {
      if (active) setValue(v);
    };
    subscribers.add(sub);
    void fetchFreeAccessMode().then(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      subscribers.delete(sub);
    };
  }, []);

  return { freeAccessMode, loading };
}
