import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TRIAL_DAYS = 7;

export const startTrialTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existingMember, error: memberError } = await supabaseAdmin
      .from("team_members")
      .select("team_id, teams!inner(subscription_status, current_period_end, plan)")
      .eq("user_id", userId)
      .maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (existingMember) return (existingMember as any).teams;

    const email = typeof claims.email === "string" ? claims.email : "";
    const nameFromEmail = email ? email.split("@")[0] : "Gestor";

    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .insert({
        owner_id: userId,
        name: `Equipe de ${nameFromEmail}`,
        plan: "trial",
        subscription_status: "trialing",
        current_period_end: new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString(),
      } as any)
      .select("id, subscription_status, current_period_end, plan")
      .single();
    if (teamError) throw new Error(teamError.message);

    const { error: tmError } = await supabaseAdmin
      .from("team_members")
      .insert({ team_id: team.id, user_id: userId, role: "manager" } as any);
    if (tmError) throw new Error(tmError.message);

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "manager" }, { onConflict: "user_id,role" });

    return {
      subscription_status: team.subscription_status,
      current_period_end: team.current_period_end,
      plan: team.plan,
    };
  });