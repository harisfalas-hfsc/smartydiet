import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getArticle } from "../lib/articles-data";

export const Route = createFileRoute("/nutrition/$slug")({
  loader: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.article.title ?? "Article"} — SmartyDiet` },
      { name: "description", content: loaderData?.article.excerpt ?? "" },
      { property: "og:title", content: loaderData?.article.title ?? "" },
      { property: "og:description", content: loaderData?.article.excerpt ?? "" },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Article not found</h1>
      <Link to="/nutrition" className="mt-4 inline-block text-primary hover:text-primary-hover">
        ← Back to all articles
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: ArticleDetail,
});

function ArticleDetail() {
  const { article } = Route.useLoaderData();

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Link to="/nutrition" className="text-sm font-semibold text-primary hover:text-primary-hover">
        ← All articles
      </Link>
      <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-primary">
        {article.category} · {article.readMinutes} min read
      </span>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{article.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>

      <div className="mt-10 space-y-4 text-foreground/90 leading-relaxed">
        <p>
          Full article content will live here. We'll fill in the body using the same
          format and structure as the Smarty family blog (intro → key points →
          practical takeaways → summary).
        </p>
        <p className="text-sm text-muted-foreground">
          Placeholder body — to be populated.
        </p>
      </div>
    </article>
  );
}
