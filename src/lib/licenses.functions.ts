import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type LicenseRow = {
  team_id: string;
  team_name: string;
  owner_id: string | null;
  owner_email: string | null;
  plan: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  members_count: number;
  reps: Array<{ id: string; name: string; email: string | null; status: string | null }>;
};

async function isSuperadmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  return !!data;
}

export const listLicenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LicenseRow[]> => {
    const { userId } = context;
    const isSA = await isSuperadmin(userId);

    let teamsQ = supabaseAdmin
      .from("teams")
      .select("id, name, owner_id, plan, subscription_status, current_period_end")
      .order("created_at", { ascending: false });

    if (!isSA) {
      // Admin: apenas o próprio time
      const { data: tm } = await supabaseAdmin
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", userId)
        .maybeSingle();
      if (!tm || (tm.role !== "admin")) return [];
      teamsQ = teamsQ.eq("id", tm.team_id);
    }

    const { data: teams, error } = await teamsQ;
    if (error) throw new Error(error.message);
    if (!teams?.length) return [];

    const teamIds = teams.map((t) => t.id);
    const ownerIds = teams.map((t) => t.owner_id).filter(Boolean) as string[];

    const [{ data: members }, { data: reps }, { data: owners }] = await Promise.all([
      supabaseAdmin.from("team_members").select("team_id, user_id").in("team_id", teamIds),
      supabaseAdmin
        .from("representatives")
        .select("id, name, email, status, team_id")
        .in("team_id", teamIds),
      ownerIds.length
        ? supabaseAdmin.auth.admin.listUsers()
        : Promise.resolve({ data: { users: [] as any[] } } as any),
    ]);

    const ownerEmailById = new Map<string, string>();
    for (const u of owners?.data?.users ?? []) {
      if (u.id && u.email) ownerEmailById.set(u.id, u.email);
    }

    return teams.map((t) => ({
      team_id: t.id,
      team_name: t.name,
      owner_id: t.owner_id,
      owner_email: t.owner_id ? ownerEmailById.get(t.owner_id) ?? null : null,
      plan: t.plan,
      subscription_status: t.subscription_status,
      current_period_end: t.current_period_end,
      members_count: (members ?? []).filter((m) => m.team_id === t.id).length,
      reps: (reps ?? [])
        .filter((r) => r.team_id === t.id)
        .map((r) => ({ id: r.id, name: r.name, email: r.email, status: r.status })),
    }));
  });

export const updateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        team_id: z.string().uuid(),
        action: z.enum(["extend", "revoke", "reactivate", "set_end"]),
        days: z.number().int().min(1).max(3650).optional(),
        end_date: z.string().datetime().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const isSA = await isSuperadmin(userId);

    // Admin só pode mexer no próprio time
    if (!isSA) {
      const { data: tm } = await supabaseAdmin
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", userId)
        .maybeSingle();
      if (!tm || tm.team_id !== data.team_id || tm.role !== "admin") {
        throw new Error("Sem permissão para alterar esta licença.");
      }
      // Admin não pode revogar a si mesmo
      if (data.action === "revoke") {
        throw new Error("Apenas o superadmin pode revogar uma licença.");
      }
    }

    const { data: team, error: tErr } = await supabaseAdmin
      .from("teams")
      .select("current_period_end, subscription_status")
      .eq("id", data.team_id)
      .single();
    if (tErr) throw new Error(tErr.message);

    const patch: { current_period_end?: string; subscription_status?: string } = {};
    if (data.action === "extend") {
      const base = team.current_period_end ? new Date(team.current_period_end) : new Date();
      const start = base.getTime() > Date.now() ? base : new Date();
      patch.current_period_end = new Date(
        start.getTime() + (data.days ?? 30) * 86400000,
      ).toISOString();
      patch.subscription_status = "active";
    } else if (data.action === "set_end") {
      if (!data.end_date) throw new Error("Data final obrigatória.");
      patch.current_period_end = data.end_date;
      patch.subscription_status = "active";
    } else if (data.action === "revoke") {
      patch.subscription_status = "canceled";
      patch.current_period_end = new Date().toISOString();
    } else if (data.action === "reactivate") {
      patch.subscription_status = "active";
      if (!team.current_period_end || new Date(team.current_period_end) < new Date()) {
        patch.current_period_end = new Date(Date.now() + 30 * 86400000).toISOString();
      }
    }

    const { error } = await supabaseAdmin.from("teams").update(patch).eq("id", data.team_id);
    if (error) throw new Error(error.message);
    return { ok: true, ...patch };
  });
