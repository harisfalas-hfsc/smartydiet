import { useEffect, useState } from "react";

/** Live connectivity flag. SSR-safe (assumes online until hydrated). */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

export const OFFLINE_MESSAGE =
  "You're offline — you can view everything saved on this device. Creating new items needs an internet connection.";
