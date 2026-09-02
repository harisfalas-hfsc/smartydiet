import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Trash2, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteMyAccount, exportMyAccountData } from "@/lib/account.functions";
import { downloadAccountExport } from "@/lib/account-export";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { clearLocalAppData } from "@/lib/local-data";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — SmartyDiet" },
      {
        name: "description",
        content: "Download your SmartyDiet data or permanently delete your account.",
      },
      { property: "og:title", content: "Account settings — SmartyDiet" },
      {
        property: "og:description",
        content: "Download your data or delete your account and all associated records.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  const runExport = useServerFn(exportMyAccountData);
  const runDelete = useServerFn(deleteMyAccount);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await runExport({ data: undefined as never });
      downloadAccountExport(data);
      toast.success("Your data has been downloaded.");
    } catch {
      toast.error("Could not export your data. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await runDelete({ data: undefined as never });
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      await supabase.auth.signOut();
      await clearLocalAppData();
      toast.success("Your account and data have been permanently deleted.");
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Could not delete your account. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <PageHeader
        eyebrow="Account"
        icon={SettingsIcon}
        title="Settings"
        subtitle="Manage your personal data and your SmartyDiet account."
      />

      <div className="mx-auto max-w-2xl space-y-4">
        <section className="rounded-3xl border-2 border-sky-400 bg-card p-5">
          <h2 className="text-base font-bold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayName ? `${displayName} — ` : ""}
            {user?.email ?? "Signed in"}
          </p>
        </section>

        <section className="rounded-3xl border-2 border-emerald-400 bg-card p-5">
          <h2 className="text-base font-bold">Download your data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get a JSON file with your profile, questionnaire answers, generated diet plans and
            account history.
          </p>
          <Button onClick={handleExport} disabled={exporting} className="mt-4">
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download JSON
          </Button>
        </section>

        <section className="rounded-3xl border-2 border-destructive/60 bg-card p-5">
          <h2 className="text-base font-bold">Delete your account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This permanently removes your profile, questionnaire answers, generated diet plans and
            account records. This cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting} className="mt-4">
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                  All of your data — profile, questionnaire answers, diet plans and account
                  records — will be deleted. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </div>
  );
}
