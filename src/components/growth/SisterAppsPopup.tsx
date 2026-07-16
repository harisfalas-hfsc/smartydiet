import { useEffect, useState } from "react";
import { ChevronLeft, ExternalLink, Sparkles } from "lucide-react";
import logoGym from "@/assets/smartygym-icon.png";
import logoMove from "@/assets/smartymove-logo.png";
import logoDiet from "@/assets/smartydiet-logo.png";

const CURRENT_APP: "gym" | "move" | "diet" = "diet";
const DELAY_MS = 10000;

type SisterApp = {
  id: "gym" | "move" | "diet";
  name: string;
  tagline: string;
  url: string;
  image: string;
};

const SISTER_APPS: SisterApp[] = [
  {
    id: "gym",
    name: "SmartyGym",
    tagline: "Train smart. Get stronger. Feel younger.",
    url: "https://smartygym.com",
    image: logoGym,
  },
  {
    id: "move",
    name: "SmartyMove",
    tagline: "Check your posture. Move better.",
    url: "https://smarty-motion-pro.lovable.app",
    image: logoMove,
  },
  {
    id: "diet",
    name: "SmartyDiet",
    tagline: "Eat smart. Fuel your body.",
    url: "https://smarty-meals-hub.lovable.app",
    image: logoDiet,
  },
];

export const SisterAppsPopup = () => {
  const [visible, setVisible] = useState(false);
  const [tucked, setTucked] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  const others = SISTER_APPS.filter((a) => a.id !== CURRENT_APP);

  if (!visible) return null;

  return (
    <>
      {/* Reopen handle when tucked */}
      <button
        type="button"
        aria-label="Show Smarty Family"
        onClick={() => setTucked(false)}
        className={`fixed left-0 top-1/2 z-40 -translate-y-1/2 rounded-r-md bg-primary text-primary-foreground shadow-md transition-all duration-300 hover:brightness-110 ${
          tucked ? "h-16 w-2 opacity-100" : "pointer-events-none w-0 opacity-0"
        }`}
      >
        <span className="sr-only">Open</span>
      </button>

      <div
        className={`fixed left-0 top-1/2 z-50 w-[260px] -translate-y-1/2 rounded-r-xl border border-l-0 border-border bg-white shadow-2xl transition-transform duration-500 ease-out ${
          tucked ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Tuck tab */}
        <button
          type="button"
          aria-label="Hide"
          onClick={() => setTucked(true)}
          className="absolute -right-0 top-1/2 flex h-10 w-6 -translate-y-1/2 translate-x-full items-center justify-center rounded-r-md bg-primary text-primary-foreground shadow-md hover:brightness-110"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="p-3">
          <div className="mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                Smarty Family
              </span>
              <span className="text-[10px] text-muted-foreground">
                Complete your wellness journey
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {others.map((app) => (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-muted"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                  <img
                    src={app.image}
                    alt={app.name}
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                    {app.name}
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {app.tagline}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Unused import guard */}
      <ChevronRight className="hidden" />
    </>
  );
};

export default SisterAppsPopup;
