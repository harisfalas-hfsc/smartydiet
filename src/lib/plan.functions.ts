import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

interface PlanResult {
  plan?: any;
  rationale?: string;
  error?: string;
}

function buildSystemPrompt() {
  return `You are SmartyDiet, an evidence-based nutrition assistant. You build safe, practical, personalized diet plans.
CRITICAL RULES:
- Absolutely exclude every food listed in allergies, intolerances, and disliked foods.
- Respect cultural/religious restrictions.
- Match the requested diet style, meal count, and eating preferences.
- Target calories using BMR/TDEE or estimate them from activity level and body data.
- Split macros to match diet style and goal (weight loss/maintenance/muscle gain/recomposition).
- Respect budget, cooking skill/time, and available kitchen equipment.
- Include portion sizes and short prep instructions per meal.
- Produce weekly variety — avoid repeating identical meals more than twice per week.
- Include a consolidated grocery list per week.
- Include a short rationale paragraph explaining WHY this plan fits the user's goal.
- End with a disclaimer: not medical advice; consult a professional for medical conditions.

OUTPUT: Return STRICTLY valid JSON matching this TypeScript type:
type Plan = {
  summary: { calorieTarget: number; macros: { protein_g: number; carbs_g: number; fat_g: number }; dietStyle: string; goal: string };
  weeks: Array<{
    weekNumber: number;
    days: Array<{
      day: number; // 1..7
      totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
      meals: Array<{
        name: string; // e.g. Breakfast, Lunch, Snack, Dinner
        time?: string;
        title: string;
        ingredients: Array<{ item: string; qty: string }>;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        instructions: string;
      }>;
    }>;
    groceryList: Array<{ item: string; qty: string; category?: string }>;
  }>;
  rationale: string;
  disclaimer: string;
};
Do NOT include markdown, code fences, or commentary. JSON only.`;
}

function buildUserPrompt(data: any, weeks: number, refinement?: string, previousPlan?: any) {
  const parts = [
    `Duration: ${weeks} week(s).`,
    `Questionnaire:\n${JSON.stringify(data, null, 2)}`,
  ];
  if (previousPlan && refinement) {
    parts.push(
      `Refine the following previously-generated plan based on this user request: "${refinement}". Keep the same duration and JSON shape. Prior plan:\n${JSON.stringify(previousPlan)}`,
    );
  }
  return parts.join("\n\n");
}

async function callGenerator(opts: {
  data: any;
  weeks: number;
  refinement?: string;
  previousPlan?: any;
}) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway("google/gemini-2.5-flash"),
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(opts.data, opts.weeks, opts.refinement, opts.previousPlan),
  });
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find first { .. last }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("AI returned invalid JSON");
  }
}

// Save questionnaire draft (or submit)
export const saveQuestionnaire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id?: string; data: any; durationWeeks?: 1 | 2 | 4; status?: "draft" | "submitted" }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase
        .from("questionnaires")
        .update({
          data: data.data,
          duration_weeks: data.durationWeeks ?? null,
          status: data.status ?? "draft",
        })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("questionnaires")
      .insert({
        user_id: userId,
        data: data.data,
        duration_weeks: data.durationWeeks ?? null,
        status: data.status ?? "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

// Generate plan for a paid session (initial or refinement)
export const generatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; refinement?: string }) => input)
  .handler(async ({ data, context }): Promise<PlanResult> => {
    const { supabase, userId } = context;
    const { data: session, error: sErr } = await supabase
      .from("generation_sessions")
      .select("id,questionnaire_id,duration_weeks,status,credits_total,credits_used")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .single();
    if (sErr || !session) return { error: "Session not found" };
    if (session.status !== "paid") return { error: "Session not paid yet" };
    if ((session.credits_used ?? 0) >= (session.credits_total ?? 3))
      return { error: "No credits remaining" };

    const { data: q, error: qErr } = await supabase
      .from("questionnaires")
      .select("data")
      .eq("id", session.questionnaire_id)
      .eq("user_id", userId)
      .single();
    if (qErr || !q) return { error: "Questionnaire not found" };

    // Load previous plan for refinements
    let previousPlan: any | undefined;
    if (data.refinement) {
      const { data: prev } = await supabase
        .from("diet_plans")
        .select("plan,version")
        .eq("session_id", session.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      previousPlan = prev?.plan;
    }

    try {
      const plan = await callGenerator({
        data: q.data,
        weeks: session.duration_weeks,
        refinement: data.refinement,
        previousPlan,
      });

      // Determine version
      const { data: existingCount } = await supabase
        .from("diet_plans")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id);
      const version = ((existingCount as any)?.length ?? 0) + 1;

      const newCreditsUsed = (session.credits_used ?? 0) + 1;
      const isFinal = newCreditsUsed >= (session.credits_total ?? 3);

      // Mark previous plans not final
      await supabase.from("diet_plans").update({ is_final: false }).eq("session_id", session.id);

      const { error: insErr } = await supabase.from("diet_plans").insert({
        user_id: userId,
        session_id: session.id,
        version,
        plan,
        rationale: plan?.rationale ?? null,
        refinement_note: data.refinement ?? null,
        is_final: isFinal,
      });
      if (insErr) return { error: insErr.message };

      await supabase
        .from("generation_sessions")
        .update({ credits_used: newCreditsUsed })
        .eq("id", session.id);

      return { plan, rationale: plan?.rationale };
    } catch (err: any) {
      return { error: err?.message ?? "AI generation failed" };
    }
  });
