import { WifiOff } from "lucide-react";
import { OFFLINE_MESSAGE, useOnlineStatus } from "@/hooks/useOnlineStatus";

/* The old sticky global banner was removed on purpose: offline state must
   never cover the app or block interaction. Status now lives in the small
   non-blocking SyncStatusPill, plus the inline notices below. */



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
