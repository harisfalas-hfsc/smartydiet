import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <p className="text-lg font-extrabold tracking-tight">
            SMARTY <span className="text-primary">DIET</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Your smart nutrition companion. Personalized diet plans, tracking tools,
            and science-based articles — all in one place.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/diets" className="hover:text-primary">Pre-built Diets</Link></li>
            <li><Link to="/builder" className="hover:text-primary">Build Your Diet</Link></li>
            <li><Link to="/nutrition" className="hover:text-primary">Nutrition Articles</Link></li>
            <li><Link to="/tools" className="hover:text-primary">Tools</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Tools</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/tools/calorie-tracker" className="hover:text-primary">Calorie Tracker</Link></li>
            <li><Link to="/tools/macro-tracker" className="hover:text-primary">Macro Tracker</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary">About</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SmartyDiet. Part of the Smarty family.
      </div>
    </footer>
  );
}
