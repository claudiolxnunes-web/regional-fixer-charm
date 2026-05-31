import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateProactiveInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  const aiKey = process.env.LOVABLE_API_KEY;
  if (!aiKey) throw new Error("LOVABLE_API_KEY não configurada");
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Últimos 9 meses de vendas para detectar padrões
  const since = new Date();
  since.setMonth(since.getMonth() - 9);

  const [{ data: clients }, { data: sales }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, client_code, abc_class, effective_status, status, segment")
      .limit(2000),
    supabase
      .from("sales")
      .select("client_id, invoice_date, revenue, line")
      .gte("invoice_date", since.toISOString().slice(0, 10))
      .limit(20000),
  ]);

  // Construir cadência por cliente
  const byClient: Record<string, { dates: string[]; total: number; lines: Set<string> }> = {};
  (sales ?? []).forEach((s) => {
    if (!s.client_id || !s.invoice_date) return;
    const k = s.client_id;
    if (!byClient[k]) byClient[k] = { dates: [], total: 0, lines: new Set() };
    byClient[k].dates.push(s.invoice_date);
    byClient[k].total += Number(s.revenue ?? 0);
    if (s.line) byClient[k].lines.add(s.line);
  });

  // Detectar candidatos a churn: A/B com cadência regular e atraso > 1.5x intervalo médio
  const today = Date.now();
  const candidates: any[] = [];
  for (const c of clients ?? []) {
    const stats = byClient[c.id];
    if (!stats || stats.dates.length < 3) continue;
    const sorted = stats.dates.map((d) => new Date(d).getTime()).sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) intervals.push((sorted[i] - sorted[i - 1]) / 86400000);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const last = sorted[sorted.length - 1];
    const daysSince = Math.floor((today - last) / 86400000);
    if (avg > 0 && daysSince > avg * 1.5 && daysSince >= 30) {
      candidates.push({
        client_id: c.id,
        client_name: c.name,
        client_code: c.client_code,
        abc_class: c.abc_class,
        segment: c.segment,
        cadencia_media_dias: Math.round(avg),
        dias_sem_comprar: daysSince,
        compras_periodo: stats.dates.length,
        receita_periodo: Math.round(stats.total),
        linhas: Array.from(stats.lines),
      });
    }
  }

  candidates.sort((a, b) => b.receita_periodo - a.receita_periodo);
  const top = candidates.slice(0, 25);

  if (top.length === 0) {
    return { created: 0, insights: [], message: "Sem padrões anômalos detectados." };
  }

  // Pedir à IA para ranquear e gerar mensagem-ação
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Você é uma IA preditiva comercial agro. Receba clientes com padrão anômalo de cadência e retorne APENAS JSON com os top 10 que merecem alerta proativo, com ação sugerida concreta para o representante.",
        },
        {
          role: "user",
          content: `Candidatos (JSON):\n${JSON.stringify(top)}\n\nRetorne JSON estrito:\n{\n  "insights": [\n    {\n      "client_id": "...",\n      "client_name": "...",\n      "client_code": "...",\n      "severity": "high|medium|low",\n      "title": "frase curta (max 60 caracteres)",\n      "message": "explicação + ação sugerida em 2-3 frases"\n    }\n  ]\n}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!aiRes.ok) {
    const err = await aiRes.text();
    throw new Error(`Falha IA: ${aiRes.status} ${err.slice(0, 200)}`);
  }
  const aiJson = await aiRes.json();
  const content = aiJson.choices?.[0]?.message?.content ?? "{}";
  let parsed: { insights: any[] } = { insights: [] };
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { insights: [] };
  }
  const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 10) : [];

  // Inserir como alertas (dedupe por chave determinística do dia)
  const today10 = new Date().toISOString().slice(0, 10);
  const rows = insights
    .filter((i) => i?.client_id && i?.title)
    .map((i) => ({
      type: "ai_proactive",
      severity: ["high", "medium", "low"].includes(i.severity) ? i.severity : "medium",
      title: String(i.title).slice(0, 200),
      message: String(i.message ?? "").slice(0, 1000),
      client_id: i.client_id,
      client_name: i.client_name ?? null,
      client_code: i.client_code ?? null,
      status: "new",
      metadata: { source: "ai_proactive_insights", date: today10 },
      dedupe_key: `ai_proactive:${i.client_id}:${today10}`,
    }));

  let created = 0;
  if (rows.length > 0) {
    const { data: inserted, error } = await supabase
      .from("alerts")
      .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(error.message);
    created = inserted?.length ?? 0;
  }

  return { created, insights, candidates_total: candidates.length };
  });
