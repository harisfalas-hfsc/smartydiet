import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDietPlansTool from "./tools/list-diet-plans";
import getDietPlanTool from "./tools/get-diet-plan";
import listSessionsTool from "./tools/list-sessions";

// The OAuth issuer MUST be the direct Supabase host (see mcp-js issuer rules).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "smartydiet-mcp",
  title: "SmartyDiet",
  version: "0.1.0",
  instructions:
    "Access the signed-in SmartyDiet user's personalized diet plans, plan versions, and generation sessions. Use list_diet_plans to browse plans, get_diet_plan to read a full plan, and list_generation_sessions to see credit usage.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDietPlansTool, getDietPlanTool, listSessionsTool],
});
