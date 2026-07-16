import { createFileRoute } from "@tanstack/react-router";
import { sendResendEmail, wrap } from "@/lib/email.server";
import { verifyCronSecret, serviceClient, logJobRun } from "@/lib/cron.server";

// Cron diário: envia para cada gestor (admin/manager) um resumo dos alertas
// novos + número de relatórios diários enviados pelos representantes do time.
export const Route = createFileRoute("/api/public/hooks/daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauth = verifyCronSecret(request);
        if (unauth) return unauth;
        const startedAt = Date.now();
        const sb = serviceClient();

        // Carrega gestores agrupados por team
        const { data: members } = await sb
          .from("team_members")
          .select("user_id, team_id, role")
          .in("role", ["admin", "manager"]);
        if (!members?.length) {
          return new Response(JSON.stringify({ ok: true, sent: 0 }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const today = new Date().toISOString().slice(0, 10);

        let sent = 0;
        const teams = Array.from(new Set(members.map((m: any) => m.team_id)));
        const cache: Record<string, { alerts: any[]; reports: number }> = {};
        for (const t of teams) {
          const [{ data: alerts }, { data: reports }] = await Promise.all([
            sb
              .from("alerts")
              .select("type, severity, title, message, client_name, created_at")
              .eq("team_id", t)
              .gte("created_at", since)
              .order("severity", { ascending: false })
              .limit(20),
            sb
              .from("daily_reports")
              .select("id", { count: "exact", head: true })
              .eq("team_id", t)
              .eq("report_date", today),
          ]);
          cache[t as string] = {
            alerts: alerts ?? [],
            reports: (reports as any)?.length ?? 0,
          };
        }

        for (const m of members as any[]) {
          const c = cache[m.team_id];
          if (!c || (c.alerts.length === 0 && c.reports === 0)) continue;
          const { data: u } = await sb.auth.admin.getUserById(m.user_id);
          const email = u.user?.email;
          if (!email) continue;

          const rows = c.alerts
            .map(
              (a) => `<tr>
              <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${a.severity}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${a.title}</td>
              <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${a.client_name ?? "—"}</td>
            </tr>`,
            )
            .join("");

          const html = wrap(
            "Resumo diário",
            `<p>${c.alerts.length} novo(s) alerta(s) nas últimas 24h. ${c.reports} relatório(s) de campo registrado(s) hoje.</p>
             ${
               rows
                 ? `<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f9fafb"><th style="text-align:left;padding:6px 8px">Sev.</th><th style="text-align:left;padding:6px 8px">Alerta</th><th style="text-align:left;padding:6px 8px">Cliente</th></tr></thead><tbody>${rows}</tbody></table>`
                 : ""
             }
             <p style="margin-top:16px"><a href="https://www.bpfconsult.com.br/alertas" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Ver alertas</a></p>`,
          );

          try {
            await sendResendEmail({
              to: email,
              subject: `Resumo diário — ${c.alerts.length} alerta(s)`,
              html,
            });
            sent++;
          } catch (e) {
            console.error("digest send failed", email, e);
          }
        }

        const result = { ok: true, sent };
        await logJobRun("daily-digest", startedAt, "success", result);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
