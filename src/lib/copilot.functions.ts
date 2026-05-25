import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function adminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Msg = { role: "user" | "assistant"; content: string };

export const askCopilot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(1).max(2000),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .max(20)
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
    const supabase = adminClient();

    // Contexto factual compacto — últimos 90 dias
    const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const mtdStart = (() => {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    })();

    const [salesRes, alertsRes, clientsRes, quotesRes] = await Promise.all([
      supabase
        .from("sales")
        .select("invoice_date, revenue, representative, rep_code, client_name, client_code, line, state, mb_cb_total")
        .gte("invoice_date", since)
        .limit(20000),
      supabase
        .from("alerts")
        .select("type, severity, title, client_name, representative_id, created_at, status")
        .gte("created_at", since)
        .limit(500),
      supabase
        .from("clients")
        .select("name, client_code, abc_class, segment, state, effective_status")
        .limit(2000),
      supabase
        .from("quotes")
        .select("client_name, status, total, valid_until, created_at")
        .gte("created_at", since)
        .limit(500),
    ]);

    const sales = salesRes.data ?? [];
    const totalRev = sales.reduce((s, x) => s + Number(x.revenue ?? 0), 0);
    const mtdRev = sales
      .filter((s) => (s.invoice_date ?? "") >= mtdStart)
      .reduce((s, x) => s + Number(x.revenue ?? 0), 0);

    const byRep: Record<string, { rev: number; orders: number; clients: Set<string> }> = {};
    const byClient: Record<string, { rev: number; name: string; last: string; orders: number }> = {};
    const byLine: Record<string, number> = {};
    const byState: Record<string, number> = {};

    sales.forEach((s) => {
      const rep = s.representative || s.rep_code || "—";
      const r = Number(s.revenue ?? 0);
      if (!byRep[rep]) byRep[rep] = { rev: 0, orders: 0, clients: new Set() };
      byRep[rep].rev += r;
      byRep[rep].orders += 1;
      if (s.client_code) byRep[rep].clients.add(s.client_code);

      const ck = s.client_code || s.client_name || "—";
      if (!byClient[ck]) byClient[ck] = { rev: 0, name: s.client_name ?? ck, last: "", orders: 0 };
      byClient[ck].rev += r;
      byClient[ck].orders += 1;
      if ((s.invoice_date ?? "") > byClient[ck].last) byClient[ck].last = s.invoice_date ?? "";

      if (s.line) byLine[s.line] = (byLine[s.line] ?? 0) + r;
      if (s.state) byState[s.state] = (byState[s.state] ?? 0) + r;
    });

    const topReps = Object.entries(byRep)
      .map(([rep, v]) => ({ rep, revenue: Math.round(v.rev), orders: v.orders, clients: v.clients.size }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    const topClients = Object.values(byClient)
      .map((c) => ({ name: c.name, revenue: Math.round(c.rev), orders: c.orders, last_invoice: c.last }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    const alerts = alertsRes.data ?? [];
    const alertsByType: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };
    alerts.forEach((a) => {
      alertsByType[a.type] = (alertsByType[a.type] ?? 0) + 1;
      alertsBySeverity[a.severity] = (alertsBySeverity[a.severity] ?? 0) + 1;
    });
    const recentHighAlerts = alerts
      .filter((a) => a.severity === "high")
      .slice(0, 15)
      .map((a) => ({ type: a.type, title: a.title, client: a.client_name }));

    const clients = clientsRes.data ?? [];
    const abcDist: Record<string, number> = {};
    clients.forEach((c) => {
      if (c.abc_class) abcDist[c.abc_class] = (abcDist[c.abc_class] ?? 0) + 1;
    });

    const quotes = quotesRes.data ?? [];
    const pipelineOpen = quotes.filter((q) => q.status === "pending").reduce((s, q) => s + Number(q.total ?? 0), 0);
    const pipelineWon = quotes.filter((q) => q.status === "accepted").reduce((s, q) => s + Number(q.total ?? 0), 0);
    const pipelineLost = quotes.filter((q) => q.status === "rejected").reduce((s, q) => s + Number(q.total ?? 0), 0);

    const ctx = {
      periodo: "últimos 90 dias",
      data_ref: new Date().toISOString().slice(0, 10),
      faturamento_90d: Math.round(totalRev),
      faturamento_mtd: Math.round(mtdRev),
      total_pedidos_90d: sales.length,
      top_representantes: topReps,
      top_clientes: topClients,
      receita_por_linha: Object.entries(byLine)
        .map(([line, v]) => ({ line, revenue: Math.round(v) }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      receita_por_uf: Object.entries(byState)
        .map(([uf, v]) => ({ uf, revenue: Math.round(v) }))
        .sort((a, b) => b.revenue - a.revenue),
      base_clientes: {
        total: clients.length,
        ativos: clients.filter((c) => c.effective_status === "active" || c.effective_status === "ativo").length,
        distribuicao_abc: abcDist,
      },
      alertas: {
        total: alerts.length,
        por_severidade: alertsBySeverity,
        por_tipo: alertsByType,
        criticos_recentes: recentHighAlerts,
      },
      pipeline: {
        aberto: Math.round(pipelineOpen),
        ganho: Math.round(pipelineWon),
        perdido: Math.round(pipelineLost),
        propostas_abertas: quotes.filter((q) => q.status === "pending").length,
      },
    };

    const history: Msg[] = (data.history ?? []).slice(-10);
    const messages = [
      {
        role: "system",
        content:
          'Você é o Copiloto Comercial Agro — assistente executivo de uma distribuidora agro brasileira. Responda em português do Brasil, direto, factual, usando APENAS os dados fornecidos no CONTEXTO JSON. Quando citar números, use formato R$ X.XXX e percentuais. Quando faltar dado, diga claramente "não consta nos últimos 90 dias". Use markdown com listas e negrito quando ajudar. No final, sugira 1 ação prática quando fizer sentido. Nunca invente nomes, valores ou datas.\n\nCONTEXTO (JSON):\n' +
          JSON.stringify(ctx),
      },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: data.question },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-pro", messages }),
    });

    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em alguns instantes.");
    if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos no workspace.");
    if (!res.ok) throw new Error(`IA ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const json = await res.json();
    const answer = json.choices?.[0]?.message?.content ?? "Sem resposta.";
    return { answer, context_snapshot: { faturamento_90d: ctx.faturamento_90d, alertas: ctx.alertas.total } };
  });
