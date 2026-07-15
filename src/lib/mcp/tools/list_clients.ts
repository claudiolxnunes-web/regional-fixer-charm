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
  name: "list_clients",
  title: "Listar clientes",
  description:
    "Lista clientes visíveis para o usuário autenticado no AgroGestão CRM. Suporta busca por nome/código e filtros por classe ABC ou estado.",
  inputSchema: {
    search: z.string().optional().describe("Texto de busca por nome ou código do cliente."),
    abc_class: z.enum(["A", "B", "C"]).optional().describe("Filtrar por classe ABC."),
    state: z.string().optional().describe("Sigla do estado (UF)."),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de resultados (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, abc_class, state, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("clients")
      .select("id, name, client_code, abc_class, segment, state, status, health_score, health_status")
      .limit(limit ?? 50);
    if (search) q = q.or(`name.ilike.%${search}%,client_code.ilike.%${search}%`);
    if (abc_class) q = q.eq("abc_class", abc_class);
    if (state) q = q.eq("state", state);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { clients: data ?? [] },
    };
  },
});
