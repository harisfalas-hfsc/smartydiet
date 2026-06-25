import { Link } from "@tanstack/react-router";
import { Apple } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/diets", label: "Diets" },
  { to: "/builder", label: "Build Your Diet" },
  { to: "/nutrition", label: "Nutrition" },
  { to: "/tools", label: "Tools" },
  { to: "/about", label: "About" },
];

export function Navigation() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Apple className="h-5 w-5 text-primary" strokeWidth={2.25} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            SMARTY <span className="text-primary">DIET</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold text-primary bg-muted" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/builder"
          className="hidden rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover md:inline-flex"
        >
          Get My Plan
        </Link>
      </div>
    </header>
  );
}
