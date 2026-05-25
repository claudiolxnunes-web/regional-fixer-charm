import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Regressão linear simples y = a + b*x
function linreg(ys: number[]): { a: number; b: number } {
  const n = ys.length;
  if (n < 2) return { a: ys[0] ?? 0, b: 0 };
  const xs = ys.map((_, i) => i);
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = my - b * mx;
  return { a, b };
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ============= FORECAST =============
export const forecastRevenue = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = adminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const { data: sales, error } = await supabase
    .from("sales")
    .select("invoice_date, revenue, representative, rep_code")
    .gte("invoice_date", since.toISOString().slice(0, 10))
    .limit(50000);
  if (error) throw new Error(error.message);

  // Mensal total e por representante
  const monthly: Record<string, number> = {};
  const byRep: Record<string, Record<string, number>> = {};
  (sales ?? []).forEach((s) => {
    if (!s.invoice_date) return;
    const k = s.invoice_date.slice(0, 7);
    const r = Number(s.revenue ?? 0);
    monthly[k] = (monthly[k] ?? 0) + r;
    const rep = s.representative || s.rep_code || "—";
    if (!byRep[rep]) byRep[rep] = {};
    byRep[rep][k] = (byRep[rep][k] ?? 0) + r;
  });

  // Construir série dos últimos 12 meses (preenchendo zeros)
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKey(d));
  }
  const totalSeries = months.map((m) => monthly[m] ?? 0);
  const { a, b } = linreg(totalSeries);

  const forecast: { month: string; predicted: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const idx = totalSeries.length - 1 + i;
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    forecast.push({ month: monthKey(d), predicted: Math.max(0, Math.round(a + b * idx)) });
  }

  // Por representante (top 10)
  const repSeries = Object.entries(byRep)
    .map(([rep, m]) => {
      const series = months.map((k) => m[k] ?? 0);
      const total = series.reduce((s, v) => s + v, 0);
      const { a: ra, b: rb } = linreg(series);
      const next = Math.max(0, Math.round(ra + rb * series.length));
      const last = series[series.length - 1] ?? 0;
      const trendPct = last > 0 ? ((next - last) / last) * 100 : 0;
      return { rep, total: Math.round(total), last_month: Math.round(last), next_month: next, trend_pct: Math.round(trendPct) };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  return {
    months,
    history: totalSeries.map((v) => Math.round(v)),
    forecast,
    reps: repSeries,
  };
});

// ============= BENCHMARK =============
export const benchmarkPeers = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = adminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const { data: sales } = await supabase
    .from("sales")
    .select("revenue, representative, rep_code, mb_cb_total, client_code, invoice_number, state")
    .gte("invoice_date", since.toISOString().slice(0, 10))
    .limit(50000);

  type Stats = { revenue: number; margin: number; clients: Set<string>; orders: Set<string>; states: Set<string> };
  const byRep: Record<string, Stats> = {};
  (sales ?? []).forEach((s) => {
    const rep = s.representative || s.rep_code || "—";
    if (!byRep[rep]) byRep[rep] = { revenue: 0, margin: 0, clients: new Set(), orders: new Set(), states: new Set() };
    byRep[rep].revenue += Number(s.revenue ?? 0);
    byRep[rep].margin += Number(s.mb_cb_total ?? 0);
    if (s.client_code) byRep[rep].clients.add(s.client_code);
    if (s.invoice_number) byRep[rep].orders.add(s.invoice_number);
    if (s.state) byRep[rep].states.add(s.state);
  });

  const rows = Object.entries(byRep).map(([rep, st]) => ({
    rep,
    revenue: Math.round(st.revenue),
    margin: Math.round(st.margin),
    margin_pct: st.revenue > 0 ? +((st.margin / st.revenue) * 100).toFixed(1) : 0,
    clients: st.clients.size,
    orders: st.orders.size,
    avg_ticket: st.orders.size > 0 ? Math.round(st.revenue / st.orders.size) : 0,
    states: st.states.size,
  }));
  rows.sort((a, b) => b.revenue - a.revenue);

  const n = rows.length || 1;
  const teamRevAvg = rows.reduce((s, r) => s + r.revenue, 0) / n;
  const teamMarginAvg = rows.reduce((s, r) => s + r.margin_pct, 0) / n;
  const teamTicketAvg = rows.reduce((s, r) => s + r.avg_ticket, 0) / n;
  const top = rows[0]?.revenue ?? 0;

  const enriched = rows.map((r, i) => ({
    ...r,
    rank: i + 1,
    percentile: Math.round(((n - i) / n) * 100),
    vs_avg_pct: teamRevAvg > 0 ? Math.round(((r.revenue - teamRevAvg) / teamRevAvg) * 100) : 0,
    gap_to_top: Math.max(0, top - r.revenue),
  }));

  return {
    team: {
      reps: n,
      total_revenue: Math.round(rows.reduce((s, r) => s + r.revenue, 0)),
      avg_revenue: Math.round(teamRevAvg),
      avg_margin_pct: +teamMarginAvg.toFixed(1),
      avg_ticket: Math.round(teamTicketAvg),
    },
    rows: enriched,
  };
});

// ============= DAILY NARRATIVE =============
export const generateNarrative = createServerFn({ method: "POST" }).handler(async () => {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");
  const supabase = adminClient();

  const today = new Date();
  const mtdStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const last30 = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 10);
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);

  const [mtd, prev, alerts, quotes] = await Promise.all([
    supabase.from("sales").select("revenue, representative, client_name, line").gte("invoice_date", mtdStart).limit(20000),
    supabase.from("sales").select("revenue").gte("invoice_date", prevMonthStart).lte("invoice_date", prevMonthEnd).limit(20000),
    supabase.from("alerts").select("type, severity, title").gte("created_at", last30).limit(500),
    supabase.from("quotes").select("status, total").gte("created_at", last30).limit(500),
  ]);

  const mtdRev = (mtd.data ?? []).reduce((s, x) => s + Number(x.revenue ?? 0), 0);
  const prevRev = (prev.data ?? []).reduce((s, x) => s + Number(x.revenue ?? 0), 0);
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projection = (mtdRev / dayOfMonth) * daysInMonth;

  const repRanking: Record<string, number> = {};
  const lineRanking: Record<string, number> = {};
  (mtd.data ?? []).forEach((s) => {
    const r = Number(s.revenue ?? 0);
    if (s.representative) repRanking[s.representative] = (repRanking[s.representative] ?? 0) + r;
    if (s.line) lineRanking[s.line] = (lineRanking[s.line] ?? 0) + r;
  });
  const topReps = Object.entries(repRanking).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topLines = Object.entries(lineRanking).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const alertsBySev: Record<string, number> = { high: 0, medium: 0, low: 0 };
  (alerts.data ?? []).forEach((a) => { alertsBySev[a.severity] = (alertsBySev[a.severity] ?? 0) + 1; });

  const pipelineOpen = (quotes.data ?? []).filter((q) => q.status === "pending").reduce((s, q) => s + Number(q.total ?? 0), 0);
  const pipelineWon = (quotes.data ?? []).filter((q) => q.status === "accepted").reduce((s, q) => s + Number(q.total ?? 0), 0);

  const ctx = {
    data_ref: today.toISOString().slice(0, 10),
    mtd_revenue: Math.round(mtdRev),
    prev_month_revenue: Math.round(prevRev),
    projection_end_of_month: Math.round(projection),
    day_of_month: dayOfMonth,
    days_in_month: daysInMonth,
    growth_vs_prev_pct: prevRev > 0 ? Math.round(((mtdRev - prevRev) / prevRev) * 100) : null,
    top_reps_mtd: topReps.map(([n, v]) => ({ name: n, revenue: Math.round(v) })),
    top_lines_mtd: topLines.map(([n, v]) => ({ line: n, revenue: Math.round(v) })),
    alerts_last_30d_by_severity: alertsBySev,
    pipeline_open: Math.round(pipelineOpen),
    pipeline_won_30d: Math.round(pipelineWon),
  };

  const prompt = `Você é o CFO/Diretor Comercial virtual de uma distribuidora agro brasileira. Gere o "Resumo da Manhã" — uma narrativa executiva, direta e estratégica, em português do Brasil, sobre o estado do negócio. Use no MÁXIMO 4 parágrafos curtos. Aponte 1 vitória, 1 risco e 1 ação prioritária do dia. Linguagem confiante, sem jargão de IA.

DADOS:
${JSON.stringify(ctx, null, 2)}

Responda em JSON estrito:
{
  "headline": "1 frase de manchete (max 90 chars)",
  "narrative": "texto em markdown (3-4 parágrafos curtos)",
  "win": "1 vitória do período",
  "risk": "1 risco a vigiar",
  "action": "1 ação prioritária para hoje"
}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = {};
  try { parsed = JSON.parse(content); } catch { parsed = {}; }

  return { context: ctx, ...parsed };
});
