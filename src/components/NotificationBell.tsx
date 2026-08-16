import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listMyNotifications, listMyThreads } from "@/lib/support.functions";

export function NotificationBell() {
  const getNotifications = useServerFn(listMyNotifications);
  const getThreads = useServerFn(listMyThreads);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [n, t] = await Promise.all([getNotifications({}), getThreads({})]);
        if (!active) return;
        const unreadNotifs =
          "notifications" in n ? n.notifications.filter((x) => !x.read_at).length : 0;
        const unreadThreads =
          "threads" in t ? t.threads.filter((x) => x.user_unread).length : 0;
        setCount(unreadNotifs + unreadThreads);
      } catch {
        /* ignore */
      }
    }
    void load();
    const id = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [getNotifications, getThreads]);

  return (
    <Link
      to="/inbox"
      aria-label="Inbox"
      className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
      style={{ textDecoration: "none" }}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
