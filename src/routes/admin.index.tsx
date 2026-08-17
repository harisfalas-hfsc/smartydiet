import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Crown,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Users,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { isAdminEmail } from "@/lib/admin";
import { adminGetStats, type AdminStats } from "@/lib/admin.functions";
import { adminUnreadMessageCount } from "@/lib/support.functions";
import { AdminMessagesTab } from "@/components/admin/AdminMessagesTab";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminRevenueTab } from "@/components/admin/AdminRevenueTab";
import { AdminPlansTab } from "@/components/admin/AdminPlansTab";
import { AdminPaymentsTab } from "@/components/admin/AdminPaymentsTab";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — SmartyDiet" },
      { name: "description", content: "SmartyDiet admin hub: members, plans, revenue and support." },
      { property: "og:title", content: "Admin — SmartyDiet" },
      { property: "og:description", content: "Members, plans, revenue and support in one hub." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type SectionKey = "revenue" | "plans" | "messages" | "members" | "customers" | "payments";

const SECTIONS: Array<{
  key: SectionKey;
  label: string;
  description: string;
  Icon: typeof Users;
}> = [
  { key: "revenue", label: "Revenue", description: "Payments & trends", Icon: BarChart3 },
  { key: "plans", label: "Diet plans", description: "Every generation", Icon: ClipboardList },
  { key: "messages", label: "Messages", description: "Support inbox", Icon: MessageSquare },
  { key: "members", label: "Members", description: "All accounts", Icon: Users },
  { key: "customers", label: "Customers", description: "Paying members", Icon: Crown },
  { key: "payments", label: "Payments", description: "Free access mode", Icon: Lock },
];

function AdminPage() {
  const getStats = useServerFn(adminGetStats);
  const getUnread = useServerFn(adminUnreadMessageCount);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [section, setSection] = useState<SectionKey | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setAuthed(isAdminEmail(data.user?.email)))
      .catch(() => setAuthed(false));
  }, []);

  const refresh = useCallback(async () => {
    const [s, u] = await Promise.all([
      getStats({ data: {} } as never).catch(() => null),
      getUnread({ data: {} } as never).catch(() => null),
    ]);
    if (s && !("error" in (s as object))) setStats(s as AdminStats);
    if (u && typeof (u as { count?: number }).count === "number")
      setUnread((u as { count: number }).count);
  }, [getStats, getUnread]);

  useEffect(() => {
    if (authed) void refresh();
  }, [authed, refresh]);

  if (authed === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-extrabold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need an admin account to open this page.
        </p>
      </div>
    );
  }

  const active = SECTIONS.find((s) => s.key === section);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 lg:max-w-5xl lg:px-8 lg:py-16">
      <PageHeader
        eyebrow="Control room"
        icon={ShieldAlert}
        title="Admin"
        subtitle="Everything that runs SmartyDiet — members, plans, revenue and support."
      />

      {!section ? (
        <div className="space-y-5">
          {unread > 0 && (
            <button
              type="button"
              onClick={() => setSection("messages")}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-primary bg-primary/10 p-4 text-left"
            >
              <MessageSquare className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">
                  {unread} unread {unread === 1 ? "message" : "messages"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Members are waiting for a reply.
                </span>
              </span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Members" value={stats?.members ?? "—"} />
            <Stat label="New (30d)" value={stats?.newMembers30d ?? "—"} />
            <Stat label="Plans" value={stats?.plansTotal ?? "—"} />
            <Stat label="Credits left" value={stats?.creditsOutstanding ?? "—"} />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {SECTIONS.map(({ key, label, description, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className="group relative flex flex-col items-start gap-2 rounded-2xl border border-blue-400 bg-card p-4 text-left transition hover:border-primary hover:shadow-md"
              >
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
                {key === "messages" && unread > 0 && (
                  <span className="absolute right-3 top-3 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSection(null);
                void refresh();
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Admin hub
            </Button>
            <p className="text-sm font-bold">{active?.label}</p>
          </div>

          {section === "revenue" && <AdminRevenueTab />}
          {section === "plans" && <AdminPlansTab />}
          {section === "messages" && <AdminMessagesTab />}
          {section === "members" && <AdminUsersTab />}
          {section === "customers" && <AdminUsersTab onlyCustomers />}
          {section === "payments" && <AdminPaymentsTab />}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-blue-400 bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
