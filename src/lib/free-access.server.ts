/** Server-side read of the global free-access switch (service role, fails closed). */
export async function readFreeAccessMode(): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "free_access_mode")
      .maybeSingle();
    if (error) return false;
    return data?.setting_value === true;
  } catch {
    return false;
  }
}

export const FREE_ACCESS_BLOCK_MESSAGE =
  "All content is currently free for signed-in members. No purchase is required.";
