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
  name: "list_opportunities",
  title: "Listar oportunidades",
  description:
    "Lista oportunidades comerciais visíveis para o usuário autenticado. Filtra por estágio e retorna valor, cliente e responsável.",
  inputSchema: {
    stage: z.string().optional().describe("Filtrar por estágio (ex.: qualificacao, proposta, ganha, perdida)."),
    client_code: z.string().optional().describe("Filtrar por código do cliente."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de resultados (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ stage, client_code, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (stage) q = q.eq("stage", stage);
    if (client_code) q = q.eq("client_code", client_code);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { opportunities: data ?? [] },
    };
  },
});
