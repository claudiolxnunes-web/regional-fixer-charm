import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { sendResendEmail, wrap } from "./email.server";

function svc() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role ausente");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Notifica gestores quando um representante envia uma nova proposta. */
export const notifyQuoteCreated = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        quoteId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = svc();
    const { data: q } = await sb
      .from("quotes")
      .select("id, client_name, total, payment_terms, valid_until, notes, team_id, representative_id")
      .eq("id", data.quoteId)
      .single();
    if (!q) return { sent: 0 };

    let repName = "Representante";
    if (q.representative_id) {
      const { data: r } = await sb
        .from("representatives")
        .select("name")
        .eq("id", q.representative_id)
        .single();
      if (r?.name) repName = r.name;
    }

    // Destinatários: admins/managers do mesmo time
    const { data: members } = await sb
      .from("team_members")
      .select("user_id, role")
      .eq("team_id", q.team_id)
      .in("role", ["admin", "manager"]);
    const ids = (members ?? []).map((m: any) => m.user_id);
    if (!ids.length) return { sent: 0 };

    const { data: users } = await sb
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    // Buscar emails via auth admin
    const emails: string[] = [];
    for (const id of ids) {
      const { data: u } = await sb.auth.admin.getUserById(id);
      if (u.user?.email) emails.push(u.user.email);
    }
    if (!emails.length) return { sent: 0 };

    const html = wrap(
      "Nova proposta para aprovação",
      `<p><strong>${repName}</strong> enviou uma nova proposta.</p>
       <ul style="line-height:1.7">
        <li><strong>Cliente:</strong> ${q.client_name ?? "—"}</li>
        <li><strong>Valor:</strong> R$ ${Number(q.total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</li>
        <li><strong>Prazo:</strong> ${q.payment_terms ?? "—"}</li>
        <li><strong>Validade:</strong> ${q.valid_until ?? "—"}</li>
       </ul>
       ${q.notes ? `<p style="color:#374151"><em>${q.notes}</em></p>` : ""}
       <p><a href="${process.env.APP_URL ?? "https://regional-fixer-charm.lovable.app"}/propostas" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Abrir propostas</a></p>`,
    );

    await sendResendEmail({
      to: emails,
      subject: `Nova proposta — ${q.client_name ?? "cliente"} (R$ ${Number(q.total ?? 0).toFixed(2)})`,
      html,
    });
    return { sent: emails.length };
  });

/** Cria invite (RLS via service role) e envia email com link de cadastro. */
export const sendInviteWithTeam = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        role: z.enum(["admin", "manager", "rep"]).default("rep"),
        teamId: z.string().uuid(),
        createdBy: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = svc();
    const { data: inv, error } = await sb
      .from("invites")
      .insert({
        email: data.email,
        role: data.role,
        team_id: data.teamId,
        created_by: data.createdBy,
      })
      .select("token")
      .single();
    if (error) throw new Error(error.message);

    const base = process.env.APP_URL ?? "https://regional-fixer-charm.lovable.app";
    const link = `${base}/login?invite=${inv.token}`;
    const html = wrap(
      "Você foi convidado para o AgroGestão CRM",
      `<p>Você recebeu um convite para participar de uma equipe no AgroGestão CRM como <strong>${data.role}</strong>.</p>
       <p>Crie sua conta usando o link abaixo (válido por 14 dias):</p>
       <p><a href="${link}" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Aceitar convite</a></p>
       <p style="font-size:12px;color:#6b7280">Se o botão não funcionar, copie: ${link}</p>`,
    );
    await sendResendEmail({
      to: data.email,
      subject: "Convite para o AgroGestão CRM",
      html,
    });
    return { ok: true };
  });
