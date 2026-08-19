import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LogOut,
  Menu,
  X,
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
  ChevronLeft,
  User,
  Sun,
  Moon,
  ShieldOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/admin";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFreeAccessMode } from "@/hooks/useFreeAccessMode";
import { useTheme } from "@/hooks/useTheme";
import { clearOfflineSession, forgetDeviceCredentials } from "@/lib/offline/credentials";
import { clearUserCache } from "@/lib/offline/store";

export function Navigation() {
  const { user, profile, displayName, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [navCount, setNavCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const unsub = router.subscribe("onResolved", () => {
      setNavCount((n) => n + 1);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Safety net: no overlay may ever leave the document unscrollable.
  useEffect(() => {
    if (menuOpen) return;
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.pointerEvents = "";
    document.documentElement.style.overflow = "";
  }, [pathname, menuOpen]);

  const canGoBack = navCount > 0 && pathname !== "/";

  async function handleSignOut() {
    // Multi-user isolation: this account's private cache never survives sign-out.
    const signedOutId = user?.id;
    await clearOfflineSession();
    if (signedOutId) await clearUserCache(signedOutId);
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const accountName = displayName || user?.email || "Account";
  const initial = accountName.slice(0, 1).toUpperCase();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <header
      className="sticky top-0 z-40 w-full bg-background"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-11 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
          >
            <Menu className="h-5 w-5" />
          </button>
          {canGoBack && (
            <button
              type="button"
              onClick={() => router.history.back()}
              aria-label="Go back"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary hover:bg-primary/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <Link
            to="/"
            aria-label={pathname === "/" ? "Refresh SmartyDiet" : "SmartyDiet home"}
            onClick={(event) => {
              if (pathname !== "/") return;
              event.preventDefault();
              window.location.reload();
            }}
            className="text-lg font-extrabold tracking-tight leading-none no-underline hover:no-underline"
            style={{ textDecoration: "none" }}
          >
            <span className="text-primary">SMARTY</span>
            <span className="text-green-500">DIET</span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {loading ? null : (
            <>
              {user && <NotificationBell />}
              <DropdownMenu open={accountOpen} onOpenChange={setAccountOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account"
                    className={
                      user
                        ? "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-primary text-xs font-bold text-primary-foreground"
                        : "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary text-primary"
                    }
                  >
                    {user && profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : user ? (
                      initial
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {user ? (
                    <>
                      <DropdownMenuLabel className="space-y-0.5">
                        <span className="block truncate">{accountName}</span>
                        {user.email && accountName !== user.email && (
                          <span className="block truncate text-xs font-normal text-muted-foreground">
                            {user.email}
                          </span>
                        )}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/plans">My plans</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/questionnaire">New plan</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/inbox" search={{ tab: "updates" as const, compose: false }}>
                          Inbox
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin">
                            <Shield className="h-4 w-4 mr-2" /> Admin
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : (
                    <>
                      <DropdownMenuLabel>Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/auth">Sign in</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/auth" search={{ mode: "signup" } as never}>
                          Sign up
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      toggleTheme();
                      setAccountOpen(false);
                    }}
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-4 w-4 mr-2" /> Light mode
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4 mr-2" /> Dark mode
                      </>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      void forgetDeviceCredentials();
                      setAccountOpen(false);
                    }}
                  >
                    <ShieldOff className="h-4 w-4 mr-2" /> Forget offline sign-in
                  </DropdownMenuItem>

                  {user && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="h-4 w-4 mr-2" /> Sign out
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {menuOpen && (
        <NavDrawer onClose={() => setMenuOpen(false)} isAuthed={!!user} isAdmin={isAdmin} />
      )}
    </header>
  );
}

function NavDrawer({
  onClose,
  isAuthed,
  isAdmin,
}: {
  onClose: () => void;
  isAuthed: boolean;
  isAdmin: boolean;
}) {
  const { freeAccessMode } = useFreeAccessMode();
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
              { to: "/inbox", label: "Inbox", Icon: Mail },
              ...(isAdmin ? [{ to: "/admin", label: "Admin", Icon: Shield }] : []),
            ],
          },
        ]
      : []),
    {
      heading: "SmartyDiet",
      items: [
        { to: "/", label: "Home", Icon: Home },
        { to: "/about", label: "About", Icon: Info },
        { to: "/how-it-works", label: "How It Works", Icon: BookOpen },
        ...(freeAccessMode ? [] : [{ to: "/pricing", label: "Pricing", Icon: Crown }]),
        { to: "/tools", label: "Tools", Icon: Wrench },
        { to: "/faq", label: "Frequently Asked Questions", Icon: HelpCircle },
        { to: "/diet-science", label: "The Diet Science", Icon: BookOpen },
        { to: "/nutrition-intelligence", label: "Nutrition Intelligence", Icon: Sparkles },
        { to: "/contact", label: "Contact", Icon: Mail },
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
          <div className="text-base font-extrabold">
            <span className="text-primary">SMARTY</span>
            <span className="text-green-500">DIET</span>
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
