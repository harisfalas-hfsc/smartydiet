import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";

export interface SeoSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface SeoFaq {
  q: string;
  a: string;
}

export interface SeoRelatedLink {
  to: string;
  label: string;
  description: string;
}

export interface SeoLandingProps {
  eyebrow: string;
  h1: React.ReactNode;
  intro: string;
  sections: SeoSection[];
  faqs: SeoFaq[];
  related: SeoRelatedLink[];
  ctaLabel?: string;
  ctaTo?: string;
}

/**
 * Shared layout for public, indexable SEO landing pages.
 * Content-only: no application logic, no data fetching.
 */
export function SeoLanding({
  eyebrow,
  h1,
  intro,
  sections,
  faqs,
  related,
  ctaLabel = "Build my personalized diet plan",
  ctaTo = "/questionnaire",
}: SeoLandingProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <PageHeader eyebrow={eyebrow} title={h1} subtitle={intro} />

      <div className="mb-10 flex justify-center">
        <Link
          to={ctaTo}
          className="inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-bold text-primary-foreground no-underline hover:opacity-95 sm:text-base"
        >
          {ctaLabel}
        </Link>
      </div>

      <div className="space-y-6">
        {sections.map((s) => (
          <section
            key={s.heading}
            className="rounded-2xl border border-border bg-card p-5 sm:p-7"
          >
            <h2 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
              {s.heading}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[15px]">{s.body}</p>
            {s.bullets && (
              <ul className="mt-4 space-y-2">
                {s.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex gap-2 text-sm leading-6 text-muted-foreground sm:text-[15px]"
                  >
                    <span aria-hidden className="text-primary">
                      •
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {faqs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-base font-bold text-foreground">{f.q}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Keep reading
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.to}
                to={r.to}
                className="rounded-2xl border border-border bg-card p-5 no-underline transition-colors hover:border-primary"
              >
                <span className="block text-sm font-bold text-foreground">{r.label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {r.description}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const SITE = "https://smartydiet.com";

export function buildSeoHead(opts: {
  path: string;
  title: string;
  description: string;
  keywords?: string;
  breadcrumbs: { name: string; path: string }[];
  faqs: SeoFaq[];
  headline: string;
}) {
  const url = `${SITE}${opts.path}`;
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      ...(opts.keywords ? [{ name: "keywords", content: opts.keywords }] : []),
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${url}#webpage`,
              url,
              name: opts.title,
              description: opts.description,
              inLanguage: "en",
              isPartOf: { "@id": `${SITE}/#website` },
              about: { "@id": `${SITE}/#organization` },
              headline: opts.headline,
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${url}#breadcrumbs`,
              itemListElement: opts.breadcrumbs.map((b, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: b.name,
                item: `${SITE}${b.path}`,
              })),
            },
            ...(opts.faqs.length
              ? [
                  {
                    "@type": "FAQPage",
                    "@id": `${url}#faq`,
                    mainEntity: opts.faqs.map((f) => ({
                      "@type": "Question",
                      name: f.q,
                      acceptedAnswer: { "@type": "Answer", text: f.a },
                    })),
                  },
                ]
              : []),
          ],
        }),
      },
    ],
  };
}
