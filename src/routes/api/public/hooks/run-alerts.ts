import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp } from "@/lib/whatsapp.server";

const SEV_LABEL: Record<string, string> = {
  high: "🔴 ALTA",
  medium: "🟡 MÉDIA",
  low: "⚪ BAIXA",
};

const TYPE_LABEL: Record<string, string> = {
  inactive_client: "Cliente inativo",
  consumption_drop: "Queda de consumo",
  low_stock: "Estoque baixo",
  goal_at_risk: "Meta em risco",
  quote_expiring: "Proposta vencendo",
};

export const Route = createFileRoute("/api/public/hooks/run-alerts")({
  server: {
    handlers: {
      POST: async () => {
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
          return new Response(JSON.stringify({ error: "missing env" }), { status: 500 });
        }
        const supabase = createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: counts, error } = await supabase.rpc("generate_all_alerts");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        // Dispatch high-severity WhatsApp notifications (not yet sent)
        let waSent = 0;
        let waErrors = 0;
        try {
          const { data: pending } = await supabase
            .from("alerts")
            .select("id, type, severity, title, message, client_name, team_id, rep_user_id, representative_id")
            .eq("severity", "high")
            .is("whatsapp_sent_at", null)
            .order("created_at", { ascending: false })
            .limit(200);

          for (const a of pending ?? []) {
            // Build recipients list: team admins/superadmins + linked rep (if any)
            const recipients = new Set<string>();

            if (a.team_id) {
              const { data: members } = await supabase
                .from("team_members")
                .select("user_id, role")
                .eq("team_id", a.team_id)
                .in("role", ["admin", "superadmin"]);
              for (const m of members ?? []) {
                const { data: prof } = await supabase
                  .from("profiles")
                  .select("phone")
                  .eq("id", m.user_id)
                  .maybeSingle();
                if (prof?.phone) recipients.add(prof.phone);
              }
            }

            if (a.representative_id) {
              const { data: rep } = await supabase
                .from("representatives")
                .select("phone")
                .eq("id", a.representative_id)
                .maybeSingle();
              if (rep?.phone) recipients.add(rep.phone);
            }

            if (recipients.size === 0) continue;

            const body =
              `${SEV_LABEL[a.severity] || a.severity} — ${TYPE_LABEL[a.type] || a.type}\n` +
              `${a.title}\n` +
              (a.client_name ? `Cliente: ${a.client_name}\n` : "") +
              (a.message ? `\n${a.message}\n` : "") +
              `\nVer: https://www.bpfconsult.com.br/alertas`;

            let anySent = false;
            for (const phone of recipients) {
              try {
                await sendWhatsApp(phone, body);
                anySent = true;
                waSent++;
              } catch (e) {
                waErrors++;
                console.error("WhatsApp send failed", phone, e);
              }
            }
            if (anySent) {
              await supabase
                .from("alerts")
                .update({ whatsapp_sent_at: new Date().toISOString() })
                .eq("id", a.id);
            }
          }
        } catch (e) {
          console.error("WhatsApp dispatch error", e);
        }

        return new Response(
          JSON.stringify({
            ok: true,
            counts,
            whatsapp: { sent: waSent, errors: waErrors },
            ts: new Date().toISOString(),
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
