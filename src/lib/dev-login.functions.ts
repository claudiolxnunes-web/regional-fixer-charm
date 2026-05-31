import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Whitelist: e-mail → role atribuída no primeiro acesso
const ALLOWED: Record<string, "superadmin" | "admin"> = {
  "claudiolx.nunes@gmail.com": "superadmin",
  "clxn2000@hotmail.com": "admin",
};

export const devQuickLogin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ email: z.string().email() }).parse(input),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const role = ALLOWED[email];
    if (!role) throw new Error("E-mail não autorizado para login rápido.");

    // Garante que o usuário existe
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    let user = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: email.split("@")[0] },
      });
      if (cErr) throw new Error(cErr.message);
      user = created.user ?? undefined;
    }
    if (!user) throw new Error("Falha ao criar/buscar usuário.");

    // Garante role atribuída
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });

    // Para admin: garante team + team_member (necessário p/ entrar no /_app)
    if (role === "admin") {
      const { data: existingMember } = await supabaseAdmin
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existingMember) {
        const { data: team, error: tErr } = await supabaseAdmin
          .from("teams")
          .insert({
            name: "Minha Empresa",
            plan: "anual",
            subscription_status: "active",
            current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
          })
          .select("id")
          .single();
        if (tErr) throw new Error(tErr.message);
        await supabaseAdmin.from("team_members").insert({
          team_id: team.id,
          user_id: user.id,
          role: "admin",
        });
      }
    }

    // Magic link → ao abrir, faz login automático
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error) throw new Error(error.message);
    const actionLink = link?.properties?.action_link;
    if (!actionLink) throw new Error("Não foi possível gerar o link de acesso.");
    return { url: actionLink };
  });
