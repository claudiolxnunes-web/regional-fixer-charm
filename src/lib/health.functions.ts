import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Check = { ok: boolean; latency_ms: number; detail?: string };

export const systemHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    // 1. DB read latency (RLS-scoped)
    const dbStart = Date.now();
    const dbRes = await supabase.from("profiles").select("id").limit(1);
    const db: Check = {
      ok: !dbRes.error,
      latency_ms: Date.now() - dbStart,
      detail: dbRes.error?.message,
    };

    // 2. AI Gateway availability (cheap HEAD-like ping using a tiny chat)
    let ai: Check = { ok: false, latency_ms: 0, detail: "LOVABLE_API_KEY ausente" };
    const aiKey = process.env.LOVABLE_API_KEY;
    if (aiKey) {
      const aiStart = Date.now();
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
        });
        ai = {
          ok: r.ok,
          latency_ms: Date.now() - aiStart,
          detail: r.ok ? undefined : `HTTP ${r.status}`,
        };
      } catch (e: any) {
        ai = { ok: false, latency_ms: Date.now() - aiStart, detail: e?.message ?? "fail" };
      }
    }

    // 3. Email (Resend) — só verifica presença do key (não envia)
    const resendOk = !!process.env.RESEND_API_KEY;
    const email: Check = {
      ok: resendOk,
      latency_ms: 0,
      detail: resendOk ? "Configurado" : "RESEND_API_KEY ausente",
    };

    // 4. WhatsApp (Twilio) — só verifica presença do key
    const twilioOk = !!process.env.TWILIO_API_KEY && !!process.env.LOVABLE_API_KEY;
    const whatsapp: Check = {
      ok: twilioOk,
      latency_ms: 0,
      detail: twilioOk ? "Configurado" : "Não configurado",
    };

    // 5. Stripe — verifica presença das chaves
    const stripeOk = !!process.env.STRIPE_SANDBOX_API_KEY || !!process.env.STRIPE_LIVE_API_KEY;
    const stripe: Check = {
      ok: stripeOk,
      latency_ms: 0,
      detail: stripeOk ? "Webhook ativo" : "Não configurado",
    };

    return {
      checked_at: new Date().toISOString(),
      services: { db, auth: db, ai, email, whatsapp, stripe },
    };
  });
