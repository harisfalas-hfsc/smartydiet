import { Link } from "@tanstack/react-router";
import { Apple } from "lucide-react";

export function Navigation() {
  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="SmartyDiet home">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Apple className="h-5 w-5 text-primary" strokeWidth={2.25} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            SMARTY <span className="text-primary">DIET</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
