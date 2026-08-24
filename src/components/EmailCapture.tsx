import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { captureLead } from "@/lib/growth.functions";
import { cn } from "@/lib/utils";

type Props = {
  source: string;
  title?: string;
  subtitle?: string;
  className?: string;
};

/** Small email capture card — used to build a list from visitors who don't buy yet. */
export function EmailCapture({
  source,
  title = "Free nutrition tips in your inbox",
  subtitle = "Practical tips, new tools and updates. No spam, unsubscribe any time.",
  className,
}: Props) {
  const submit = useServerFn(captureLead);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await submit({ data: { email, source } });
    setBusy(false);
    if (res && "error" in res) {
      toast.error(res.error);
      return;
    }
    setDone(true);
    setEmail("");
    toast.success("You're in — check your inbox.");
  }

  return (
    <div className={cn("rounded-2xl border border-blue-400 bg-card p-5", className)}>
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-base font-extrabold">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

      {done ? (
        <p className="mt-4 text-sm font-bold text-primary">
          Thanks! We&apos;ll be in touch.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Email address"
            className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send me tips"}
          </button>
        </form>
      )}
    </div>
  );
}
