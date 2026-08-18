import { WifiOff } from "lucide-react";
import { OFFLINE_MESSAGE, useOnlineStatus } from "@/hooks/useOnlineStatus";

/** Slim persistent bar shown whenever the device has no connection. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-300">
      <WifiOff className="h-3.5 w-3.5" />
      You&apos;re offline — viewing what&apos;s saved on this device.
    </div>
  );
}

/** Inline explanation used next to disabled create/pay/AI actions. */
export function OfflineActionNotice({ className = "" }: { className?: string }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>
      <WifiOff className="mr-1 inline h-3.5 w-3.5" />
      {OFFLINE_MESSAGE}
    </p>
  );
}

/** Honest empty state: distinguishes "nothing here" from "nothing saved yet". */
export function OfflineEmptyState({ children }: { children?: React.ReactNode }) {
  const online = useOnlineStatus();
  if (!online) {
    return (
      <p className="text-sm text-muted-foreground">
        You&apos;re offline and this device has no saved copy yet. Connect once and it will be
        stored here.
      </p>
    );
  }
  return <>{children}</>;
}
