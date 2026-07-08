// PORTABLE COPY FOR SMARTYDIET PROJECT
// Copy this file into SmartyDiet as: src/components/growth/SisterAppsPopup.tsx
// Also copy these 3 images into SmartyDiet's src/assets/:
//   smartygym-icon.png (from SmartyGym's public/icon-512.png — the brain+barbell PWA icon)
//   smartymove-logo.png, smartydiet-logo.png
// Then in SmartyDiet's src/App.tsx add:
//   import { SisterAppsPopup } from "@/components/growth/SisterAppsPopup";
//   and render <SisterAppsPopup /> inside <BrowserRouter> (before </BrowserRouter>).
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles } from "lucide-react";
import logoMove from "@/assets/smartymove-logo.png";
import logoDiet from "@/assets/smartydiet-logo.png";
import logoGym from "@/assets/smartygym-icon.png";

const CURRENT_APP: "gym" | "move" | "diet" = "diet";

type SisterApp = {
  id: "gym" | "move" | "diet";
  name: string;
  tagline: string;
  url: string;
  image: string;
  darkImage?: boolean;
};

const SISTER_APPS: SisterApp[] = [
  {
    id: "gym",
    name: "SmartyGym",
    tagline: "Train smart. Get stronger. Feel younger.",
    url: "https://smartygym.com",
    image: logoGym,
    darkImage: true,
  },
  {
    id: "move",
    name: "SmartyMove",
    tagline: "Check your posture. Correct your movement. Live better.",
    url: "https://smarty-motion-pro.lovable.app",
    image: logoMove,
  },
  {
    id: "diet",
    name: "SmartyDiet",
    tagline: "Eat smart. Fuel your body. Live longer.",
    url: "https://smarty-meals-hub.lovable.app",
    image: logoDiet,
  },
];

const DELAY_MS = 5000;

export const SisterAppsPopup = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  const others = SISTER_APPS.filter((a) => a.id !== CURRENT_APP);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-2.5rem)] max-w-[350px] sm:max-w-2xl sm:w-[95vw] max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-0 border-2 border-primary/40 rounded-xl bg-card shadow-2xl">
        <div className="p-3 sm:p-6">
          <div className="text-center mb-3 sm:mb-5 px-4 sm:px-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] sm:text-[11px] font-bold uppercase tracking-normal mb-2 sm:mb-3">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Smarty Wellness Family
            </span>
            <h2 className="text-base sm:text-2xl font-bold text-foreground leading-tight">
              Complete your Smarty Wellness journey
            </h2>
            <p className="hidden sm:block text-sm text-muted-foreground mt-1">
              Two more apps designed to work together with {SISTER_APPS.find(a => a.id === CURRENT_APP)?.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
            {others.map((app) => (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-row sm:flex-col items-center sm:items-stretch rounded-lg border border-border bg-background overflow-hidden hover:border-primary/60 hover:shadow-lg transition-all"
              >
                <div className={`w-20 h-20 shrink-0 sm:w-full sm:h-auto sm:aspect-[4/3] overflow-hidden flex items-center justify-center ${app.darkImage ? "bg-[#0F172A] p-2 sm:p-4" : "bg-white p-3 sm:p-6"}`}>
                  <img
                    src={app.image}
                    alt={app.name}
                    loading="lazy"
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-2.5 sm:p-4 flex flex-col gap-1 sm:gap-2 flex-1 min-w-0">
                  <h3 className="text-sm sm:text-lg font-bold text-foreground">{app.name}</h3>
                  <p className="text-[11px] sm:text-sm text-muted-foreground leading-snug flex-1 line-clamp-2 sm:line-clamp-3">{app.tagline}</p>
                  <Button
                    size="sm"
                    className="w-full mt-0.5 sm:mt-2 gap-1.5 font-semibold text-xs sm:text-sm h-7 sm:h-9"
                  >
                    <span className="hidden sm:inline">Visit {app.name}</span>
                    <span className="sm:hidden">Visit</span>
                    <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </Button>
                </div>
              </a>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SisterAppsPopup;
