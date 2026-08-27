import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  mealSlotsFor,
  sortPlanStructure,
  type StrictRules,
  type ValidationIssue,
  validatePlan,
} from "@/lib/plan-validation";

export { validatePlan } from "@/lib/plan-validation";
export type { StrictRules, ValidationIssue } from "@/lib/plan-validation";

export interface PlanResult {
  plan?: any;
  rationale?: string;
  error?: string;
  warnings?: string[];
  processing?: boolean;
}

type GenerationContext = {
  supabase: any;
  userId: string;
  claims?: Record<string, unknown>;
};

// -------------------- Rules & Validation --------------------

interface RefinementConstraints {
  mealsPerDay?: number;
  excludeFoods?: string[];
  includeMoreFoods?: string[];
  calorieDelta?: number;
  calorieTarget?: number;
  fastingWindow?: string;
  notes?: string;
}

function normalizeToken(s: string) {
  return s.toLowerCase().trim();
}

function buildBaseRules(q: any, weeks: number): StrictRules {
  const eating = q?.eating ?? {};
  const goal = q?.goal ?? {};
  const basics = q?.basics ?? {};
  const activity = q?.activity ?? {};

  const fasting = eating.fasting ?? {};
  const isOMAD = fasting.window === "OMAD";
  const mealsPerDay: number = isOMAD
    ? 1
    : Math.max(1, Math.min(6, Number(eating.mealsPerDay) || 3));

  // Compute default calorie target if not provided
  let calorieTarget: number | undefined = Number(goal.calorieTarget) || undefined;
  if (!calorieTarget) {
    const weight = Number(basics.weight) || 70;
    const height = Number(basics.height) || 170;
    const age = Number(basics.age) || 30;
    const male = basics.gender === "male";
    // Mifflin-St Jeor
    const bmr = male
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;
    const mult =
      activity.activityLevel === "sedentary"
        ? 1.2
        : activity.activityLevel === "light"
          ? 1.375
          : activity.activityLevel === "active"
            ? 1.725
            : activity.activityLevel === "very_active"
              ? 1.9
              : 1.55;
    let tdee = Math.round(bmr * mult);
    if (goal.goal === "weight_loss") tdee -= 500;
    else if (goal.goal === "muscle_gain") tdee += 300;
    else if (goal.goal === "recomposition") tdee -= 200;
    // Fasting approach adjusts deficit
    if (fasting.approach === "aggressive") tdee -= 200;
    if (fasting.approach === "very_aggressive") tdee -= 400;
    calorieTarget = Math.max(1200, Math.round(tdee / 10) * 10);
  }

  const dislike: string[] = [
    ...((eating.dislikedFoods as string[]) ?? []),
    ...String(eating.dislikedFoodsOther ?? "").split(","),
  ]
    .map(normalizeToken)
    .filter(Boolean);

  const allergyTags: string[] = ((eating.allergyTags as string[]) ?? []).filter(
    (t) => t && t !== "none",
  );
  const allergyMap: Record<string, string[]> = {
    nuts: ["almond", "walnut", "cashew", "pecan", "hazelnut", "pistachio", "nut"],
    peanuts: ["peanut"],
    "dairy/lactose": ["milk", "yogurt", "cheese", "butter", "cream", "dairy"],
    gluten: ["wheat", "bread", "pasta", "flour", "barley", "rye", "gluten"],
    eggs: ["egg"],
    shellfish: ["shrimp", "prawn", "crab", "lobster", "shellfish"],
    fish: ["fish", "tuna", "salmon", "cod", "sardine", "anchovy"],
    soy: ["soy", "tofu", "edamame"],
    sesame: ["sesame", "tahini"],
  };
  const allergyExcludes = allergyTags.flatMap((t) => allergyMap[t] ?? [t]);
  const allergyFree = String(eating.allergies ?? "")
    .split(",")
    .map(normalizeToken)
    .filter(Boolean);
  const culturalMap: Record<string, string[]> = {
    "no pork": ["pork", "bacon", "ham", "prosciutto"],
    "no beef": ["beef", "steak"],
    "no alcohol": ["wine", "beer", "alcohol"],
  };
  const cultural = ((eating.culturalRestrictions as string[]) ?? []).flatMap(
    (t) => culturalMap[t] ?? [t],
  );

  const excludeFoods = Array.from(
    new Set([...dislike, ...allergyExcludes, ...allergyFree, ...cultural]),
  );

  const dietStyle =
    eating.dietStyle === "other"
      ? String(eating.dietStyleOther || "custom")
      : String(eating.dietStyle || "balanced");

  return {
    mealsPerDay,
    calorieTarget,
    calorieTolerance: 25,
    excludeFoods,
    dietStyle,
    goal: String(goal.goal || "maintenance"),
    fastingWindow: fasting.window
      ? fasting.window === "custom"
        ? String(fasting.customWindow || "custom")
        : String(fasting.window)
      : undefined,
    weeks,
  };
}

function mergeConstraints(base: StrictRules, extra: RefinementConstraints): StrictRules {
  const merged: StrictRules = { ...base };
  if (extra.mealsPerDay && extra.mealsPerDay >= 1 && extra.mealsPerDay <= 6) {
    merged.mealsPerDay = extra.mealsPerDay;
  }
  if (extra.calorieTarget && extra.calorieTarget > 500) {
    merged.calorieTarget = extra.calorieTarget;
  } else if (extra.calorieDelta) {
    merged.calorieTarget = Math.max(1000, merged.calorieTarget + extra.calorieDelta);
  }
  if (extra.fastingWindow) merged.fastingWindow = extra.fastingWindow;
  if (extra.excludeFoods?.length) {
    merged.excludeFoods = Array.from(
      new Set([...merged.excludeFoods, ...extra.excludeFoods.map(normalizeToken)]),
    );
  }
  return merged;
}

// -------------------- Prompt building --------------------

function buildSystemPrompt(rules: StrictRules) {
  return `You are SmartyDiet, an evidence-based nutrition assistant. You build safe, practical, personalized diet plans.

ABSOLUTE HARD RULES (non-negotiable — a plan violating any of these is REJECTED):
1. The finished plan will have exactly ${rules.weeks} week(s). For the single requested week in each response, return exactly 7 days using its specified global day numbers. Never omit, summarize, or abbreviate a day.
2. Every day must contain EXACTLY ${rules.mealsPerDay} meal(s), in this exact order: ${mealSlotsFor(rules.mealsPerDay).join(" → ")}. No more, no less.
3. Every day's total calories must equal ${rules.calorieTarget} kcal within ±${rules.calorieTolerance} kcal. Do the arithmetic; sum of meal calories per day MUST land in that range.
4. The following foods/ingredients are FORBIDDEN and must not appear in any meal title or ingredients (case-insensitive substring): ${rules.excludeFoods.length ? rules.excludeFoods.join(", ") : "(none)"}.
5. Diet style: ${rules.dietStyle}. Goal: ${rules.goal}.${rules.fastingWindow ? ` Fasting window: ${rules.fastingWindow} — all meals must fit inside the eating window; no eating outside it.` : ""}
6. Portion sizes must be numeric and realistic. Include short prep instructions per meal.
7. Weekly variety — avoid repeating identical meals more than twice per week.
8. Provide a consolidated grocery list per week.
9. Include a short rationale explaining WHY this plan fits the user's goal.
10. End with a disclaimer: not medical advice; consult a professional for medical conditions.

MATH DISCIPLINE: Before returning JSON, sum each day's meal calories yourself and adjust portion sizes so the total lands within ±${rules.calorieTolerance} of ${rules.calorieTarget}. Do not approximate.

OUTPUT: You will be asked for exactly one day at a time. Return STRICTLY valid JSON matching:
type DayResult = {
  day: {
    day: number;
    totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
    meals: Array<{
        name: string; time?: string; title: string;
        ingredients: Array<{ item: string; qty: string }>;
        calories: number; protein_g: number; carbs_g: number; fat_g: number;
        instructions: string;
    }>;
  };
};
No markdown, no code fences, JSON only.`;
}

function buildUserPrompt(
  q: any,
  rules: StrictRules,
  weekNumber: number,
  dayNumber: number,
  refinement?: string,
  previousPlan?: any,
) {
  const parts = [
    `Build ONLY Day ${dayNumber} from Week ${weekNumber} of ${rules.weeks}. Return that one complete day only.`,
    `Meals/day: ${rules.mealsPerDay}. Exact meal order: ${mealSlotsFor(rules.mealsPerDay).join(" → ")}. Calorie target: ${rules.calorieTarget} kcal/day (±${rules.calorieTolerance}).`,
    `Excluded foods: ${rules.excludeFoods.length ? rules.excludeFoods.join(", ") : "none"}.`,
    `Questionnaire:\n${JSON.stringify(q, null, 2)}`,
  ];
  if (previousPlan && refinement) {
    parts.push(
      `REFINEMENT REQUEST (must override earlier answers when they conflict): "${refinement}"`,
      `Prior Day ${dayNumber} for reference:\n${JSON.stringify(previousPlan?.weeks?.find((week: any) => Number(week?.weekNumber) === weekNumber)?.days?.find((day: any) => Number(day?.day) === dayNumber) ?? previousPlan)}`,
    );
  }
  return parts.join("\n\n");
}

// -------------------- AI helpers --------------------

function stripFences(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new Error("AI returned invalid JSON");
  }
}

async function askModel(system: string, user: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const gateway = createLovableAiGatewayProvider(key);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { text } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system,
        prompt:
          attempt === 1
            ? user
            : `${user}\n\nIMPORTANT RETRY: Return one complete, strictly valid JSON object. Do not truncate it, use markdown, or add prose.`,
        maxOutputTokens: 16_000,
      });
      return stripFences(text);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI returned invalid JSON");
}

async function extractRefinementConstraints(refinement: string): Promise<RefinementConstraints> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return {};
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway("google/gemini-2.5-flash"),
    system: `Extract explicit, actionable diet constraints from a user's refinement request. Return STRICT JSON only:
{
  "mealsPerDay": number | null,
  "excludeFoods": string[] | null,
  "includeMoreFoods": string[] | null,
  "calorieDelta": number | null,
  "calorieTarget": number | null,
  "fastingWindow": "16:8"|"18:6"|"20:4"|"OMAD"|null,
  "notes": string | null
}
Rules:
- "one meal a day", "OMAD", "only one meal" => mealsPerDay: 1, fastingWindow: "OMAD".
- "two meals" => mealsPerDay: 2.
- "less dairy", "no dairy" => excludeFoods: ["dairy","milk","yogurt","cheese"].
- "no fish"/"no salmon" => add those to excludeFoods.
- "more protein" => notes: "increase protein macro".
- "1800 kcal" => calorieTarget: 1800.
- "-200 kcal" => calorieDelta: -200.
- Unknowns => null. JSON only, no prose.`,
    prompt: refinement,
  });
  try {
    const obj = stripFences(text);
    return {
      mealsPerDay: obj.mealsPerDay ?? undefined,
      excludeFoods: Array.isArray(obj.excludeFoods) ? obj.excludeFoods : undefined,
      includeMoreFoods: Array.isArray(obj.includeMoreFoods) ? obj.includeMoreFoods : undefined,
      calorieDelta: typeof obj.calorieDelta === "number" ? obj.calorieDelta : undefined,
      calorieTarget: typeof obj.calorieTarget === "number" ? obj.calorieTarget : undefined,
      fastingWindow: obj.fastingWindow ?? undefined,
      notes: obj.notes ?? undefined,
    };
  } catch {
    return {};
  }
}

async function generateWithRepair(
  q: any,
  rules: StrictRules,
  refinement?: string,
  previousPlan?: any,
): Promise<{ plan: any; issues: ValidationIssue[] }> {
  const system = buildSystemPrompt(rules);
  const dayResults: any[][] = [];
  for (let weekNumber = 1; weekNumber <= rules.weeks; weekNumber += 1) {
    const firstDay = (weekNumber - 1) * 7 + 1;
    dayResults.push(
      await Promise.all(
        Array.from({ length: 7 }, (_, index) =>
          askModel(
            system,
            buildUserPrompt(q, rules, weekNumber, firstDay + index, refinement, previousPlan),
          ),
        ),
      ),
    );
  }

  const assemble = () => {
    const weeks = dayResults.map((results, weekIndex) => {
      const days = results.map((result) => result?.day ?? result);
      const groceryList = days.flatMap((day: any) =>
        (day?.meals ?? []).flatMap((meal: any) =>
          (meal?.ingredients ?? []).map((ingredient: any) => ({
            item: ingredient.item,
            qty: ingredient.qty,
          })),
        ),
      );
      return { weekNumber: weekIndex + 1, days, groceryList };
    });
    const firstTotals = weeks[0]?.days?.[0]?.totals ?? {};
    return {
      summary: {
        calorieTarget: rules.calorieTarget,
        macros: {
          protein_g: Number(firstTotals.protein_g) || 0,
          carbs_g: Number(firstTotals.carbs_g) || 0,
          fat_g: Number(firstTotals.fat_g) || 0,
        },
        dietStyle: rules.dietStyle,
        goal: rules.goal,
        // Rules the plan was calculated from, so the customer can verify it.
        weeks: rules.weeks,
        daysPerWeek: 7,
        mealsPerDay: rules.mealsPerDay,
        mealSlots: mealSlotsFor(rules.mealsPerDay),
        fastingWindow: rules.fastingWindow ?? null,
        excludeFoods: rules.excludeFoods,
      },

      weeks,
      rationale: `This plan follows the selected ${rules.dietStyle} style, ${rules.goal} goal, calorie target, meal schedule, and stated food restrictions.`,
      disclaimer: "This plan is not medical advice. Consult a qualified professional for medical conditions.",
    };
  };

  let plan = assemble();
  let issues = validatePlan(plan, rules);
  for (let pass = 0; pass < 2 && issues.length; pass += 1) {
    const affectedDays = new Set(
      issues
        .filter((issue) => issue.day > 0)
        .map((issue) => issue.day),
    );
    if (issues.some((issue) => issue.day === 0)) {
      for (let day = 1; day <= rules.weeks * 7; day += 1) affectedDays.add(day);
    }
    for (const dayNumber of affectedDays) {
      const weekNumber = Math.ceil(dayNumber / 7);
      const index = (dayNumber - 1) % 7;
      const dayIssues = issues.filter((issue) => issue.day === dayNumber || issue.day === 0);
      const current = dayResults[weekNumber - 1]?.[index];
      const fixPrompt = `${buildUserPrompt(q, rules, weekNumber, dayNumber, refinement, previousPlan)}\n\nYour previous Day ${dayNumber} violated hard rules. Correct every violation and return the complete corrected DayResult JSON.\nViolations:\n- ${dayIssues
        .slice(0, 20)
        .map((issue) => issue.detail)
        .join("\n- ")}\n\nPrevious invalid DayResult:\n${JSON.stringify(current)}`;
      dayResults[weekNumber - 1][index] = await askModel(system, fixPrompt);
    }
    plan = assemble();
    issues = validatePlan(plan, rules);
  }
  return { plan, issues };
}


export async function runPlanGeneration(
  data: { sessionId: string; refinement?: string; operationId?: string },
  context: GenerationContext,
): Promise<PlanResult> {
    const { supabase, userId, claims } = context;
    const fail = async (reason: string): Promise<PlanResult> => {
      // The customer already paid. Never lose the debt: keep the session and
      // questionnaire on record, schedule an automatic background retry, and
      // alert support immediately.
      const { data: current } = await supabase
        .from("generation_sessions")
        .select("attempt_count")
        .eq("id", data.sessionId)
        .maybeSingle();
      const attemptCount = (current?.attempt_count ?? 0) + 1;
      const backoffMinutes = [2, 10, 30, 120][Math.min(attemptCount - 1, 3)];
      await supabase
        .from("generation_sessions")
        .update({
          status: "generation_failed",
          attempt_count: attemptCount,
          last_error: reason.slice(0, 2000),
          next_retry_at:
            attemptCount >= 5
              ? null
              : new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
        })
        .eq("id", data.sessionId)
        .in("status", ["paid", "generating", "completed", "generation_failed"]);
      const { sendPlanGenerationFailureAlert } = await import("@/lib/plan-generation-alert.server");
      await sendPlanGenerationFailureAlert(
        { supabase, userId, claims: claims as Record<string, unknown> },
        {
          sessionId: data.sessionId,
          operationId: data.operationId,
          refinement: data.refinement,
          reason,
        },
      ).catch(() => undefined);
      return { error: "We encountered an error this time. Please try again later." };
    };
    if (data.operationId && data.refinement) {
      const { data: completed } = await supabase
        .from("diet_plans")
        .select("plan,rationale")
        .eq("id", data.operationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (completed?.plan) {
        const savedPlan = completed.plan as any;
        return {
          plan: savedPlan,
          rationale: completed.rationale ?? savedPlan?.rationale,
          warnings: savedPlan?._warnings ?? [],
        };
      }
    }
    const { data: session, error: sErr } = await supabase
      .from("generation_sessions")
      .select(
        "id,questionnaire_id,duration_weeks,status,credits_total,credits_used,stripe_payment_intent",
      )
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .single();
    if (sErr || !session)
      return fail(`Session lookup failed: ${sErr?.message ?? "Session not found"}`);
    // Another webhook/browser request already owns this generation. The
    // stable session operation will be polled instead of spending AI credits twice.
    if (!data.refinement && session.status === "generating") {
      return { processing: true };
    }
    if (
      session.status !== "paid" &&
      session.status !== "completed" &&
      session.status !== "generation_failed"
    ) {
      return fail(`Session has invalid status: ${session.status}`);
    }

    if (!data.refinement && session.status !== "completed") {
      const { data: claimed, error: claimError } = await supabase
        .from("generation_sessions")
        .update({ status: "generating" })
        .eq("id", session.id)
        .eq("user_id", userId)
        .in("status", ["paid", "generation_failed"])
        .select("id")
        .maybeSingle();
      if (claimError) return fail(`Generation could not start: ${claimError.message}`);
      if (!claimed) return { processing: true };
    }

    if (!data.refinement) {
      const { data: existingPlan } = await supabase
        .from("diet_plans")
        .select("plan,rationale")
        .eq("session_id", session.id)
        .eq("user_id", userId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingPlan?.plan) {
        await supabase
          .from("generation_sessions")
          .update({ status: "paid", next_retry_at: null })
          .eq("id", session.id);
        const savedPlan = existingPlan.plan as any;
        return {
          plan: savedPlan,
          rationale: existingPlan.rationale ?? savedPlan?.rationale,
          warnings: savedPlan?._warnings ?? [],
        };
      }
    }

    if ((session.credits_used ?? 0) >= (session.credits_total ?? 2))
      return fail("No plan-generation credits remain for this session");

    const { data: q, error: qErr } = await supabase
      .from("questionnaires")
      .select("data")
      .eq("id", session.questionnaire_id)
      .eq("user_id", userId)
      .single();
    if (qErr || !q)
      return fail(`Questionnaire lookup failed: ${qErr?.message ?? "Questionnaire not found"}`);

    try {
      let rules = buildBaseRules(q.data, session.duration_weeks);
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
        const extra = await extractRefinementConstraints(data.refinement);
        rules = mergeConstraints(rules, extra);
      }

      const { plan, issues } = await generateWithRepair(
        q.data,
        rules,
        data.refinement,
        previousPlan,
      );

      if (issues.length > 0) {
        return fail(
          `Generated plan failed hard validation: ${issues
            .slice(0, 20)
            .map((issue) => issue.detail)
            .join(" | ")}`,
        );
      }

      const { data: existing } = await supabase
        .from("diet_plans")
        .select("id")
        .eq("session_id", session.id);
      const version = (existing?.length ?? 0) + 1;

      const newCreditsUsed = (session.credits_used ?? 0) + 1;
      // The newest version is always the one shown first; both versions stay available.
      const isFinal = true;

      await supabase.from("diet_plans").update({ is_final: false }).eq("session_id", session.id);

      const warnings: string[] = [];
      const planToSave = { ...sortPlanStructure(plan), _warnings: warnings };

      const { error: insErr } = await supabase.from("diet_plans").insert({
        ...(data.operationId ? { id: data.operationId } : {}),
        user_id: userId,
        session_id: session.id,
        version,
        plan: planToSave,
        rationale: plan?.rationale ?? null,
        refinement_note: data.refinement ?? null,
        is_final: isFinal,
      });
      if (insErr) {
        // A resumed return page can overlap the original request. The stable
        // operation id makes that retry idempotent: if the other request won
        // the insert race, return its saved plan instead of reporting failure.
        if (data.operationId) {
          const { data: racedPlan } = await supabase
            .from("diet_plans")
            .select("plan,rationale")
            .eq("id", data.operationId)
            .eq("user_id", userId)
            .maybeSingle();
          if (racedPlan?.plan) {
            const savedPlan = racedPlan.plan as any;
            return {
              plan: savedPlan,
              rationale: racedPlan.rationale ?? savedPlan?.rationale,
              warnings: savedPlan?._warnings ?? [],
            };
          }
        }
        return fail(`Saving the generated plan failed: ${insErr.message}`);
      }

      await supabase
        .from("generation_sessions")
        .update({
          credits_used: newCreditsUsed,
          status: "paid",
          next_retry_at: null,
          last_error: null,
        })
        .eq("id", session.id);

      await supabase
        .from("diet_plan_attempts")
        .update({
          status: "generated",
          reached_stage: "Diet generated",
          completed_at: new Date().toISOString(),
          failure_stage: null,
          failure_reason: null,
          failed_at: null,
        })
        .eq("generation_session_id", session.id);

      return { plan: planToSave, rationale: plan?.rationale, warnings };
    } catch (err: any) {
      const message = err?.message ?? "AI generation failed";
      const status = Number(err?.statusCode ?? err?.status ?? err?.response?.status);
      const statusDetail = Number.isFinite(status) ? ` (status ${status})` : "";
      return fail(`${message}${statusDetail}`);
    }
}

export async function repairStoredPlan(
  planId: string,
  context: GenerationContext,
): Promise<PlanResult> {
  const { supabase, userId } = context;
  const { data: stored, error: storedError } = await supabase
    .from("diet_plans")
    .select("id,session_id,plan,refinement_note")
    .eq("id", planId)
    .eq("user_id", userId)
    .single();
  if (storedError || !stored) {
    return { error: `Stored plan lookup failed: ${storedError?.message ?? "Plan not found"}` };
  }

  const { data: session, error: sessionError } = await supabase
    .from("generation_sessions")
    .select("id,questionnaire_id,duration_weeks")
    .eq("id", stored.session_id)
    .eq("user_id", userId)
    .single();
  if (sessionError || !session) {
    return { error: `Session lookup failed: ${sessionError?.message ?? "Session not found"}` };
  }

  const { data: questionnaire, error: questionnaireError } = await supabase
    .from("questionnaires")
    .select("data")
    .eq("id", session.questionnaire_id)
    .eq("user_id", userId)
    .single();
  if (questionnaireError || !questionnaire) {
    return {
      error: `Questionnaire lookup failed: ${questionnaireError?.message ?? "Questionnaire not found"}`,
    };
  }

  let rules = buildBaseRules(questionnaire.data, session.duration_weeks);
  if (stored.refinement_note) {
    rules = mergeConstraints(rules, await extractRefinementConstraints(stored.refinement_note));
  }
  const { plan, issues } = await generateWithRepair(
    questionnaire.data,
    rules,
    stored.refinement_note ?? undefined,
    stored.plan,
  );
  if (issues.length > 0) {
    return {
      error: `Repaired plan failed hard validation: ${issues
        .slice(0, 20)
        .map((issue) => issue.detail)
        .join(" | ")}`,
    };
  }

  const planToSave = { ...sortPlanStructure(plan), _warnings: [] };
  const { error: updateError } = await supabase
    .from("diet_plans")
    .update({ plan: planToSave, rationale: plan?.rationale ?? null })
    .eq("id", stored.id)
    .eq("user_id", userId);
  if (updateError) return { error: `Saving repaired plan failed: ${updateError.message}` };
  return { plan: planToSave, rationale: plan?.rationale, warnings: [] };
}
