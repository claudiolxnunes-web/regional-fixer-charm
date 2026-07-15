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
  name: "list_alerts",
  title: "Listar alertas",
  description:
    "Lista alertas comerciais (ex.: cliente inativo, queda de compra) visíveis para o usuário autenticado. Filtra por severidade e status.",
  inputSchema: {
    severity: z.enum(["high", "medium", "low"]).optional().describe("Filtrar por severidade."),
    status: z.string().optional().describe("Filtrar por status (ex.: open, dismissed)."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de alertas (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ severity, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("alerts")
      .select("id, type, severity, title, client_name, representative_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (severity) q = q.eq("severity", severity);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { alerts: data ?? [] },
    };
  },
});
