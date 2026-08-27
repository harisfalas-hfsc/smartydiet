import { createClient } from "@supabase/supabase-js";
import { repairStoredPlan } from "../src/lib/plan-generation.server";

const planIds = process.argv.slice(2);
const url = process.env["SUPABASE_URL"];
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!url || !serviceKey || planIds.length === 0) {
  throw new Error("Database credentials and at least one plan ID are required");
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

for (const planId of planIds) {
  const { data: row, error } = await supabase
    .from("diet_plans")
    .select("user_id")
    .eq("id", planId)
    .single();
  if (error || !row) throw new Error(`Could not load ${planId}: ${error?.message ?? "missing"}`);

  const result = await repairStoredPlan(planId, {
    supabase,
    userId: row.user_id,
    claims: { repair: true },
  });
  if (result.error) throw new Error(`Repair failed for ${planId}: ${result.error}`);
  console.log(`Repaired ${planId}`);
}