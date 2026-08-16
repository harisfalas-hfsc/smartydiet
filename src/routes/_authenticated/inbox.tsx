import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Inbox as InboxIcon, Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listMyNotifications,
  listMyThreads,
  setNotificationsRead,
  deleteNotifications,
  setThreadsRead,
  deleteMyThreads,
  replyToThread,
  submitMemberMessage,
  type AppNotification,
  type SupportThread,
} from "@/lib/support.functions";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({
    meta: [
      { title: "Your Inbox — SmartyDiet" },
      { name: "description", content: "Your SmartyDiet notifications and support conversations in one place." },
      { property: "og:title", content: "Your Inbox — SmartyDiet" },
      { property: "og:description", content: "Notifications and support conversations." },
    ],
  }),
  component: InboxPage,
});

function fmt(d: string) {
  return new Date(d).toLocaleString();
}

function InboxPage() {
  const getNotifications = useServerFn(listMyNotifications);
  const getThreads = useServerFn(listMyThreads);
  const markRead = useServerFn(setNotificationsRead);
  const removeNotifs = useServerFn(deleteNotifications);
  const markThreadsRead = useServerFn(setThreadsRead);
  const removeThreads = useServerFn(deleteMyThreads);
  const reply = useServerFn(replyToThread);
  const newMessage = useServerFn(submitMemberMessage);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [n, t] = await Promise.all([getNotifications({}), getThreads({})]);
    if ("notifications" in n) setNotifications(n.notifications);
    if ("threads" in t) setThreads(t.threads);
    setLoading(false);
  }, [getNotifications, getThreads]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    const unreadThreads = threads.filter((t) => t.user_unread).map((t) => t.id);
    if (unreadIds.length) void markRead({ data: { ids: unreadIds, read: true } });
    if (unreadThreads.length) void markThreadsRead({ data: { threadIds: unreadThreads } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-10 pt-4 space-y-6">
      <Card className="border-2 border-primary">
        <CardContent className="p-6 text-center space-y-2">
          <InboxIcon className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-2xl font-bold">Your Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Updates from SmartyDiet and your support conversations.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="notifications">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="mr-2 h-4 w-4" /> Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-4 space-y-3">
            {notifications.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            )}
            {notifications.map((n) => (
              <Card key={n.id} className="border">
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.body && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{fmt(n.created_at)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete notification"
                    onClick={async () => {
                      await removeNotifs({ data: { ids: [n.id] } });
                      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="messages" className="mt-4 space-y-4">
            <NewThreadForm
              onSend={async (subject, message) => {
                const res = await newMessage({ data: { subject, message } });
                if ("ok" in res) await load();
                return "error" in res ? res.error : null;
              }}
            />
            {threads.map((t) => (
              <ThreadCard
                key={t.id}
                thread={t}
                onReply={async (message) => {
                  const res = await reply({ data: { threadId: t.id, message } });
                  if ("ok" in res) await load();
                  return "error" in res ? res.error : null;
                }}
                onDelete={async () => {
                  await removeThreads({ data: { threadIds: [t.id] } });
                  setThreads((prev) => prev.filter((x) => x.id !== t.id));
                }}
              />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function NewThreadForm({
  onSend,
}: {
  onSend: (subject: string, message: string) => Promise<string | null>;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="border-2 border-primary">
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-bold">Start a new conversation</p>
        <Input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Textarea
          rows={4}
          placeholder="How can we help?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          disabled={busy || !message.trim()}
          onClick={async () => {
            setBusy(true);
            setError(await onSend(subject, message));
            setBusy(false);
            setSubject("");
            setMessage("");
          }}
        >
          <Send className="mr-2 h-4 w-4" /> {busy ? "Sending…" : "Send message"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ThreadCard({
  thread,
  onReply,
  onDelete,
}: {
  thread: SupportThread;
  onReply: (message: string) => Promise<string | null>;
  onDelete: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card className="border">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{thread.subject}</p>
            <p className="text-xs text-muted-foreground">
              {thread.status} · {fmt(thread.last_message_at)}
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Delete conversation" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {thread.messages.map((m) => (
            <div
              key={m.id}
              className={
                m.sender === "admin"
                  ? "rounded-2xl bg-primary/10 p-3 text-sm"
                  : "rounded-2xl bg-secondary p-3 text-sm"
              }
            >
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {m.sender === "admin" ? "SmartyDiet" : "You"} · {fmt(m.created_at)}
              </p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
        </div>
        <Textarea
          rows={3}
          placeholder="Write a reply…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="resize-none"
        />
        <Button
          size="sm"
          disabled={busy || !text.trim()}
          onClick={async () => {
            setBusy(true);
            await onReply(text);
            setText("");
            setBusy(false);
          }}
        >
          <Send className="mr-2 h-4 w-4" /> Reply
        </Button>
      </CardContent>
    </Card>
  );
}
