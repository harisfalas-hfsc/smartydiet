import { createFileRoute } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "SmartyDiet FAQ — pricing, refunds, accuracy and privacy" },
      {
        name: "description",
        content:
          "Answers to common questions about SmartyDiet: pricing, refunds, medical disclaimer, data privacy and accuracy.",
      },
    ],
  }),
  component: FAQ,
});

const ITEMS = [
  {
    q: "How much does it cost?",
    a: "$4.99 as a one-time payment. That includes your initial personalized plan and 2 refinement credits (3 AI generations in total). There is no subscription.",
  },
  {
    q: "Is SmartyDiet medical advice?",
    a: "No. SmartyDiet is a general wellness tool. It is not medical advice, and it is not a substitute for a doctor, registered dietitian or other qualified healthcare professional. If you have a medical condition, are pregnant/breastfeeding, or take medication that affects diet, consult a professional before starting any plan.",
  },
  {
    q: "How accurate is the plan?",
    a: "The plan uses established nutrition principles (BMR/TDEE, macro splits, meal timing) and respects the preferences, allergies and constraints you enter. It is a strong starting point, but real-world biology varies — treat it as guidance and adjust based on how you feel and respond over time.",
  },
  {
    q: "What if I have allergies?",
    a: "Allergies are a required field and the AI is explicitly instructed to exclude every allergen you list. Please be thorough — the plan is only as safe as what you tell us.",
  },
  {
    q: "Can I get a refund?",
    a: "If the plan generation fails for a technical reason and we cannot deliver a plan, contact us for a full refund. Because plans are personalized digital content delivered immediately, refunds are otherwise not guaranteed.",
  },
  {
    q: "What do you do with my data?",
    a: "Your questionnaire and plan are stored in your SmartyDiet account so you can access them anytime. We do not sell your data. See our Privacy Policy for full details.",
  },
  {
    q: "Can I change my plan later?",
    a: "You get 2 refinements included ('swap breakfasts', 'less dairy', 'more protein', etc.). After that, you can start a new plan whenever you want by paying $4.99 again.",
  },
];

function FAQ() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">FAQ</h1>
      <p className="mt-3 text-muted-foreground">
        The answers to the questions we get most often. Still unsure? Reach out via the footer.
      </p>
      <Accordion type="single" collapsible className="mt-8">
        {ITEMS.map((it, i) => (
          <AccordionItem key={i} value={`i${i}`}>
            <AccordionTrigger className="text-left">{it.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
