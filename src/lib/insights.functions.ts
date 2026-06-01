import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const supabase = supabaseAdmin;

  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const [salesRes, alertsRes, repsRes] = await Promise.all([
    supabase.from("sales").select("invoice_date, revenue, representative, client_name, line, state")
      .gte("invoice_date", since.toISOString().slice(0, 10)).limit(5000),
    supabase.from("alerts").select("type, severity, title, created_at").gte("created_at", since.toISOString()).limit(500),
    supabase.from("representatives").select("name, total_sales, performance_score").limit(100),
  ]);

  const sales = salesRes.data ?? [];
  const totalRev = sales.reduce((s, x) => s + Number(x.revenue ?? 0), 0);
  const monthly: Record<string, number> = {};
  sales.forEach((s) => {
    if (!s.invoice_date) return;
    const k = s.invoice_date.slice(0, 7);
    monthly[k] = (monthly[k] ?? 0) + Number(s.revenue ?? 0);
  });
  const repTotals: Record<string, number> = {};
  sales.forEach((s) => {
    const k = s.representative ?? "—";
    repTotals[k] = (repTotals[k] ?? 0) + Number(s.revenue ?? 0);
  });
  const topReps = Object.entries(repTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const alerts = alertsRes.data ?? [];
  const alertsBySeverity = { high: 0, medium: 0, low: 0 } as Record<string, number>;
  alerts.forEach((a) => { alertsBySeverity[a.severity] = (alertsBySeverity[a.severity] ?? 0) + 1; });

  const summary = {
    period_months: 6,
    total_revenue: Math.round(totalRev),
    monthly_revenue: monthly,
    top_5_representatives: topReps.map(([n, v]) => ({ name: n, revenue: Math.round(v) })),
    active_representatives: (repsRes.data ?? []).length,
    alerts_count: alerts.length,
    alerts_by_severity: alertsBySeverity,
  };

  const prompt = `Você é um analista comercial sênior de uma distribuidora agro. Analise os dados abaixo e gere 5 insights acionáveis e práticos para a gestão. Cada insight deve ter um TÍTULO curto, uma BREVE análise (2-3 frases) e uma RECOMENDAÇÃO de ação. Use linguagem direta, em português do Brasil.

DADOS:
${JSON.stringify(summary, null, 2)}

Responda em formato JSON válido:
{ "insights": [ { "title": "...", "analysis": "...", "recommendation": "..." } ] }`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI Gateway error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = {};
  try { parsed = JSON.parse(content); } catch { parsed = { insights: [] }; }
  return { summary, insights: parsed.insights ?? [] };
  });
