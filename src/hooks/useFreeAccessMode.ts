import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      return data?.setting_value === true;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();

  const value = await inFlight;
  notify(value);
  return value;
}


/** SSR-known value, provided by the root route loader. */
export const FreeAccessContext = createContext<boolean | null>(null);

export function useFreeAccessMode(): { freeAccessMode: boolean; loading: boolean } {
  const ssrValue = useContext(FreeAccessContext);
  const [freeAccessMode, setValue] = useState<boolean>(ssrValue ?? cached ?? false);
  const [loading, setLoading] = useState(ssrValue === null && cached === null);

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
