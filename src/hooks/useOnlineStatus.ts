import { useEffect, useState } from "react";
import { isOnlineNow, subscribeConnectivity } from "@/lib/offline/connectivity";

/** Live connectivity flag. SSR-safe (assumes online until hydrated). */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(isOnlineNow());
    return subscribeConnectivity(setOnline);
  }, []);

  return online;
}

export const OFFLINE_MESSAGE =
  "You're offline — you can view everything saved on this device. Creating new items needs an internet connection.";
