import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabaseForToken } from "../supabase";

export function registerListQuotes(server: McpServer) {
  server.registerTool(
    "list_quotes",
    {
      title: "Listar propostas / cotações",
      description:
        "Lista propostas (quotes) visíveis para o usuário autenticado, com filtros por status e cliente.",
      inputSchema: {
        status: z.string().optional().describe("Filtrar por status (ex.: rascunho, enviada, aprovada, recusada)."),
        client_code: z.string().optional().describe("Filtrar por código do cliente."),
        limit: z.number().int().min(1).max(200).optional().describe("Máximo de resultados (padrão 50)."),
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ status, client_code, limit }, extra) => {
      const token = extra.authInfo?.token;
      if (!token) {
        return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
      }
      const sb = supabaseForToken(token);
      let q = sb
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit ?? 50);
      if (status) q = q.eq("status", status);
      if (client_code) q = q.eq("client_code", client_code);
      const { data, error } = await q;
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return {
        content: [{ type: "text", text: JSON.stringify(data ?? []) }],
        structuredContent: { quotes: data ?? [] },
      };
    }
  );
}
