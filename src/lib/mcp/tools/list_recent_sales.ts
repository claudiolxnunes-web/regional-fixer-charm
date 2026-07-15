import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_recent_sales",
  title: "Vendas recentes",
  description:
    "Retorna vendas recentes do AgroGestão CRM (últimos N dias) visíveis para o usuário autenticado. Útil para acompanhar faturamento, clientes e representantes ativos.",
  inputSchema: {
    days: z.number().int().min(1).max(365).optional().describe("Janela em dias (padrão 30)."),
    client_code: z.string().optional().describe("Filtrar por código do cliente."),
    representative: z.string().optional().describe("Filtrar por representante ou rep_code."),
    limit: z.number().int().min(1).max(500).optional().describe("Máximo de linhas (padrão 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days, client_code, representative, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const since = new Date(Date.now() - (days ?? 30) * 86400000).toISOString().slice(0, 10);
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("sales")
      .select("invoice_date, invoice_number, client_name, client_code, representative, rep_code, line, state, revenue")
      .gte("invoice_date", since)
      .order("invoice_date", { ascending: false })
      .limit(limit ?? 100);
    if (client_code) q = q.eq("client_code", client_code);
    if (representative) q = q.or(`representative.ilike.%${representative}%,rep_code.eq.${representative}`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const total = (data ?? []).reduce((s, r: any) => s + Number(r.revenue ?? 0), 0);
    return {
      content: [{ type: "text", text: JSON.stringify({ total_revenue: total, rows: data ?? [] }) }],
      structuredContent: { total_revenue: total, rows: data ?? [] },
    };
  },
});
