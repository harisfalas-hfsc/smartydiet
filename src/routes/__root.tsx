import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Navigation } from "../components/Navigation";
import { SiteFooter } from "../components/SiteFooter";
import { PaymentTestModeBanner } from "../components/PaymentTestModeBanner";
import { Toaster } from "../components/ui/sonner";
import { SisterAppsPopup } from "../components/growth/SisterAppsPopup";

const SITE_URL = "https://smartydiet.com";
const OG_IMAGE =
  "https://smartydiet.com/__l5e/assets-v1/d1e59921-5974-44b4-96d8-9bfbec15c871/smartydiet-social.png";

const SITE_DESCRIPTION =
  "SmartyDiet is the AI Nutrition Intelligence Platform — your pocket dietitian and diet coach. Personalized AI meal plans, Smarty Nutrition Score™, Metabolic Age™, and free calorie, BMI, BMR, TDEE and macro calculators.";

const KEYWORDS = [
  "AI Nutrition Intelligence Platform",
  "AI Dietitian",
  "AI Nutritionist",
  "AI Diet Coach",
  "AI Meal Planner",
  "Personal Nutrition Plan",
  "Custom Meal Plans",
  "Nutrition Coaching",
  "Nutrition Assessment",
  "Nutrition Analysis",
  "Nutrition Score",
  "Diet Score",
  "Diet Analysis",
  "Diet Plan Generator",
  "Diet Coach App",
  "Weight Loss App",
  "Weight Management",
  "Calorie Calculator",
  "BMI Calculator",
  "BMR Calculator",
  "TDEE Calculator",
  "Macro Calculator",
  "Macro Tracking",
  "Calorie Tracking",
  "Calorie Counter",
  "Food Diary",
  "Food Log",
  "Nutrient Analysis",
  "Micronutrient Tracking",
  "Protein Calculator",
  "Carb Calculator",
  "Fat Calculator",
  "Water Intake Calculator",
  "Ideal Weight Calculator",
  "Body Fat Calculator",
  "Waist-to-Hip Ratio",
  "Personalized Nutrition",
  "Precision Nutrition",
  "Digital Dietitian",
  "Virtual Nutritionist",
  "Meal Prep Planner",
  "Grocery List Generator",
  "Healthy Eating App",
  "Balanced Diet",
  "Mediterranean Diet",
  "Keto Diet Plan",
  "Low Carb Diet",
  "High Protein Diet",
  "Intermittent Fasting",
  "Vegan Meal Plan",
  "Vegetarian Meal Plan",
  "Diabetes Meal Plan",
  "Heart Healthy Diet",
  "Anti-Inflammatory Diet",
  "Muscle Gain Diet",
  "Cutting Diet",
  "Bulking Diet",
  "Metabolic Health",
  "Nutritional Deficiency",
  "Food Sensitivity",
  "Dietary Guidelines",
  "Portion Control",
  "Mindful Eating",
  "Sustainable Weight Loss",
  "Nutrition Education",
  "Smarty Nutrition Score",
  "Smarty Metabolic Age",
  "Smarty Macro Index",
  "Smarty Nutrition Intelligence",
  "Smarty Meal Plan",
  "Smarty Calorie Engine",
].join(", ");

const JSONLD_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "SmartyDiet",
      alternateName: ["Smarty Diet", "SmartyDiet AI", "AI Nutrition Intelligence Platform"],
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512x512.png`,
      description:
        "SmartyDiet is the AI Nutrition Intelligence Platform — a pocket dietitian, nutrition consultant and diet coach powered by AI.",
      foundingDate: "2024",
      email: "smartydiet@outlook.com",
      knowsAbout: [
        "Nutrition",
        "Dietetics",
        "Meal Planning",
        "Macronutrients",
        "Micronutrients",
        "Weight Management",
        "Metabolic Health",
        "Precision Nutrition",
        "AI Nutrition Analysis",
        "Digital Dietitian",
        "Personalized Nutrition",
        "Calorie Balance",
        "Intermittent Fasting",
        "Mediterranean Diet",
        "Ketogenic Diet",
        "Habit Coaching",
      ],
      sameAs: [
        "https://smartymove.com",
        "https://smartygym.com",
        "https://smartywellness.com",
        "https://www.instagram.com/smartydiet",
        "https://www.tiktok.com/@smarty.diet",
      ],
      contactPoint: [
        {
          "@type": "ContactPoint",
          email: "smartydiet@outlook.com",
          contactType: "customer support",
          availableLanguage: ["English"],
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "SmartyDiet",
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/glossary?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "SmartyDiet — AI Nutrition Intelligence Platform",
      applicationCategory: ["HealthApplication", "LifestyleApplication", "FoodEstablishment"],
      applicationSubCategory: "AI Nutrition Intelligence Platform",
      operatingSystem: "Web, iOS, Android",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      description: SITE_DESCRIPTION,
      featureList: [
        "AI Meal Planner",
        "Smarty Nutrition Score™",
        "Smarty Metabolic Age™",
        "Smarty Macro Index™",
        "Personalized diet plans",
        "Calorie calculator",
        "BMI calculator",
        "BMR calculator",
        "TDEE calculator",
        "Macro calculator",
        "USDA food & calorie counter",
        "Grocery list generator",
        "Food log",
        "Habit coaching",
      ],
      keywords: KEYWORDS,
      offers: {
        "@type": "Offer",
        price: "9.99",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
      },
    },
  ],
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title:
          "SmartyDiet — AI Nutrition Intelligence Platform | Your Pocket Dietitian & Diet Coach",
      },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "keywords", content: KEYWORDS },
      { name: "author", content: "SmartyDiet" },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "googlebot", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "application-name", content: "SmartyDiet" },
      { name: "apple-mobile-web-app-title", content: "SmartyDiet" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "theme-color", content: "#ffffff" },
      { property: "og:site_name", content: "SmartyDiet" },
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content:
          "SmartyDiet — AI Nutrition Intelligence Platform | Your Pocket Dietitian & Diet Coach",
      },
      { property: "og:description", content: SITE_DESCRIPTION },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@smartydiet" },
      {
        name: "twitter:title",
        content:
          "SmartyDiet — AI Nutrition Intelligence Platform | Your Pocket Dietitian & Diet Coach",
      },
      { name: "twitter:description", content: SITE_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(JSONLD_GRAPH),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <PaymentTestModeBanner />
        <Navigation />
        <main>
          <Outlet />
        </main>
        <SiteFooter />
        <Toaster />
        <SisterAppsPopup />
      </div>
    </QueryClientProvider>
  );
}
