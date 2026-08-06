import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabaseForToken } from "../supabase";

export function registerListOpportunities(server: McpServer) {
  server.registerTool(
    "list_opportunities",
    {
      title: "Listar oportunidades",
      description:
        "Lista oportunidades comerciais visíveis para o usuário autenticado. Filtra por estágio e retorna valor, cliente e responsável.",
      inputSchema: {
        stage: z.string().optional().describe("Filtrar por estágio (ex.: qualificacao, proposta, ganha, perdida)."),
        client_code: z.string().optional().describe("Filtrar por código do cliente."),
        limit: z.number().int().min(1).max(200).optional().describe("Máximo de resultados (padrão 50)."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ stage, client_code, limit }, extra) => {
      const token = extra.authInfo?.token;
      if (!token) {
        return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
      }
      const sb = supabaseForToken(token);
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
    }
  );
}
