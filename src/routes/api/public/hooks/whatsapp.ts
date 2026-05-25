// Webhook do Twilio WhatsApp: mensagem recebida vira lead/alerta no CRM.
// Configurar em Twilio Console > Sandbox > "When a message comes in":
//   https://<projeto>.lovable.app/api/public/hooks/whatsapp  (HTTP POST)
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/hooks/whatsapp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return new Response("missing env", { status: 500 });

        // Twilio envia application/x-www-form-urlencoded
        const form = await request.formData();
        const fromRaw = String(form.get("From") || ""); // "whatsapp:+5511999999999"
        const body = String(form.get("Body") || "").trim();
        const profileName = String(form.get("ProfileName") || "").trim();

        if (!fromRaw || !body) {
          return new Response("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
        }

        const phone = fromRaw.replace(/^whatsapp:/, "");
        const digitsOnly = phone.replace(/\D/g, "");

        const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

        // Tenta achar um representante pelo telefone para determinar o team_id
        const { data: reps } = await supabase
          .from("representatives")
          .select("id, team_id, user_id, phone")
          .limit(500);

        const rep = (reps ?? []).find((r) => {
          const rd = (r.phone ?? "").replace(/\D/g, "");
          return rd && (rd === digitsOnly || rd.endsWith(digitsOnly.slice(-9)) || digitsOnly.endsWith(rd.slice(-9)));
        });

        // Tenta achar um cliente pelo telefone (caso seja cliente conhecido)
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name, team_id, phone, representative_id")
          .limit(2000);

        const client = (clients ?? []).find((c) => {
          const cd = (c.phone ?? "").replace(/\D/g, "");
          return cd && (cd === digitsOnly || cd.endsWith(digitsOnly.slice(-9)) || digitsOnly.endsWith(cd.slice(-9)));
        });

        const team_id = client?.team_id ?? rep?.team_id ?? null;
        if (!team_id) {
          // Sem team_id não dá pra inserir respeitando RLS lógica. Apenas loga e responde OK.
          console.warn("[whatsapp-webhook] sem team_id para", phone);
          return new Response("<Response/>", { status: 200, headers: { "Content-Type": "text/xml" } });
        }

        const isKnownClient = !!client;
        const title = isKnownClient
          ? `📩 WhatsApp de ${client!.name}`
          : `📩 Novo lead WhatsApp${profileName ? ` — ${profileName}` : ""}`;

        const message = `${body}\n\n— ${phone}${profileName ? ` (${profileName})` : ""}`;

        await supabase.from("alerts").insert({
          team_id,
          type: isKnownClient ? "whatsapp_message" : "whatsapp_lead",
          severity: "medium",
          status: "new",
          title,
          message,
          client_id: client?.id ?? null,
          client_name: client?.name ?? profileName ?? null,
          representative_id: client?.representative_id ?? rep?.id ?? null,
          rep_user_id: rep?.user_id ?? null,
          dedupe_key: `wa:${digitsOnly}:${Date.now()}`,
          metadata: { phone, profile_name: profileName, raw_body: body },
        });

        // TwiML vazio: não responde automaticamente, apenas registra.
        return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response/>", {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        });
      },
    },
  },
});
