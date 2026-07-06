import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "support@smartydiet.com";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact SmartyDiet — Get in touch with our team" },
      {
        name: "description",
        content:
          "Questions, feedback or partnership ideas? Reach the SmartyDiet team directly by email — we usually reply within 1 business day.",
      },
      { property: "og:title", content: "Contact SmartyDiet" },
      {
        property: "og:description",
        content: "Reach the SmartyDiet team by email. We usually reply within 1 business day.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Mail className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Get in touch
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Questions about your plan, billing, or general feedback? Email us and we'll get back to
          you as soon as we can.
        </p>
      </div>

      <div className="mt-10 rounded-3xl border border-border bg-card p-6 text-center sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Email</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {SUPPORT_EMAIL}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          We usually reply within 1 business day.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild size="lg">
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="mr-2 h-4 w-4" /> Send us an email
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
