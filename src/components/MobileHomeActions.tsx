import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Salad,
  type LucideIcon,
} from "lucide-react";
import getStartedImage from "@/assets/mobile-get-started.jpg";
import howItWorksImage from "@/assets/mobile-how-it-works.jpg";
import nutritionToolsImage from "@/assets/mobile-nutrition-tools.jpg";
import { useStartPlanTarget } from "@/components/StartPlanLink";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type HomeAction = {
  title: string;
  description: string;
  image: string;
  icon: LucideIcon;
  to: "/questionnaire" | "/auth" | "/how-it-works" | "/tools";
  search?: { mode: "signup"; next: string };
};

export function MobileHomeActions() {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const startTarget = useStartPlanTarget();

  const actions: HomeAction[] = [
    {
      title: "Get started",
      description: "Create your personalized nutrition plan",
      image: getStartedImage,
      icon: Salad,
      to: startTarget.to,
      search: startTarget.search,
    },
    {
      title: "How it works",
      description: "See how your plan is created for you",
      image: howItWorksImage,
      icon: ClipboardCheck,
      to: "/how-it-works",
    },
    {
      title: "Free nutrition tools",
      description: "Calculate calories, macros, BMR and TDEE",
      image: nutritionToolsImage,
      icon: Calculator,
      to: "/tools",
    },
  ];

  useEffect(() => {
    if (!carouselApi) return;
    const updateSelected = () => setActiveIndex(carouselApi.selectedScrollSnap());
    updateSelected();
    carouselApi.on("select", updateSelected);
    carouselApi.on("reInit", updateSelected);
    return () => {
      carouselApi.off("select", updateSelected);
      carouselApi.off("reInit", updateSelected);
    };
  }, [carouselApi]);

  return (
    <div className="mt-5 sm:hidden">
      <div className="mb-4 flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => carouselApi?.scrollPrev()}
          aria-label="Previous option"
          className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="text-lg font-extrabold uppercase text-primary">Start your plan</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => carouselApi?.scrollNext()}
          aria-label="Next option"
          className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Carousel className="w-full" opts={{ align: "center", loop: true }} setApi={setCarouselApi}>
        <CarouselContent className="-ml-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <CarouselItem key={action.title} className="basis-[75%] pl-3 sm:basis-[60%]">
                <Link
                  to={action.to}
                  search={action.search as never}
                  className="flex flex-col overflow-hidden rounded-xl border-2 border-green-500/60 bg-card transition-all duration-300 hover:scale-[1.02] hover:border-green-500 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/8] w-full shrink-0 overflow-hidden">
                    <img
                      src={action.image}
                      alt={action.title}
                      width={1536}
                      height={768}
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover object-[center_top]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-center p-2 text-center">
                    <div className="mb-0.5 flex items-center justify-center gap-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-3 w-3 text-primary" />
                      </span>
                      <h2 className="whitespace-nowrap text-xs font-bold leading-tight text-foreground">
                        {action.title}
                      </h2>
                    </div>
                    <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                      {action.description}
                    </p>
                    <span className="mt-0.5 flex items-center justify-center gap-1 text-[9px] font-medium text-primary">
                      Explore
                      <ChevronRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="mt-4 flex justify-center gap-2">
        {actions.map((action, index) => (
          <Button
            key={action.title}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => carouselApi?.scrollTo(index)}
            aria-label={`Go to ${action.title}`}
            className={cn(
              "h-2.5 rounded-full p-0 transition-all",
              activeIndex === index
                ? "w-2.5 scale-125 bg-primary hover:bg-primary"
                : "w-2.5 bg-primary/30 hover:bg-primary/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}