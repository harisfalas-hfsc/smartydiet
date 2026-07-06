import { Link, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Home,
  Wrench,
  Crown,
  Info,
  Mail,
  HelpCircle,
  Shield,
  FileText,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/smartydiet-logo.png";

export function Navigation() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header
      className="sticky top-0 z-40 w-full bg-background"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-primary/10"
          >
            <Menu className="h-7 w-7" strokeWidth={2.5} />
          </button>

          <Link to="/" className="flex items-center gap-2" aria-label="SmartyDiet home">
            <img src={logoUrl} alt="" width={36} height={36} className="h-9 w-9" />
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              SMARTY <span className="text-primary">DIET</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-[140px] truncate">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/plans">My plans</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/questionnaire">New plan</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      {menuOpen && <NavDrawer onClose={() => setMenuOpen(false)} isAuthed={!!user} />}
    </header>
  );
}

function NavDrawer({ onClose, isAuthed }: { onClose: () => void; isAuthed: boolean }) {
  const sections: {
    heading: string;
    items: { to: string; label: string; Icon: typeof Home }[];
  }[] = [
    ...(isAuthed
      ? [
          {
            heading: "App",
            items: [
              { to: "/plans", label: "My plans", Icon: ClipboardList },
              { to: "/questionnaire", label: "New plan", Icon: Sparkles },
            ],
          },
        ]
      : []),
    {
      heading: "SmartyDiet",
      items: [
        { to: "/", label: "Home", Icon: Home },
        { to: "/how-it-works", label: "How it works", Icon: BookOpen },
        { to: "/tools", label: "Tools", Icon: Wrench },
        { to: "/pricing", label: "Pricing", Icon: Crown },
        { to: "/about", label: "About", Icon: Info },
        { to: "/contact", label: "Contact us", Icon: Mail },
        { to: "/faq", label: "FAQ", Icon: HelpCircle },
      ],
    },
    {
      heading: "Legal",
      items: [
        { to: "/privacy", label: "Privacy Policy", Icon: Shield },
        { to: "/terms", label: "Terms of Service", Icon: FileText },
        { to: "/disclaimer", label: "Disclaimer", Icon: AlertTriangle },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside
        className="absolute left-0 top-0 flex h-full w-[85%] max-w-[340px] flex-col bg-background shadow-2xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2 text-base font-extrabold">
            <img src={logoUrl} alt="" width={24} height={24} className="h-6 w-6" />
            <span>
              SMARTY <span className="text-primary">DIET</span>
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {sections.map((s) => (
            <div key={s.heading} className="mt-2">
              <div className="px-2 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {s.heading}
              </div>
              <ul className="space-y-1">
                {s.items.map(({ to, label, Icon }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-primary/10"
                      style={{ textDecoration: "none" }}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-xl brand-gradient-soft text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
}
