import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListClients } from "./tools/list_clients";
import { registerListRecentSales } from "./tools/list_recent_sales";
import { registerListAlerts } from "./tools/list_alerts";
import { registerListOpportunities } from "./tools/list_opportunities";
import { registerListQuotes } from "./tools/list_quotes";

// One fresh McpServer per request (stateless transport, see src/routes/mcp.ts) —
// avoids sharing tool-call state across concurrent requests from different users.
export function createAgroGestaoMcpServer(): McpServer {
  const server = new McpServer({
    name: "agrogestao-crm-mcp",
    title: "AgroGestão CRM",
    version: "0.1.0",
  }, {
    instructions:
      "Ferramentas do AgroGestão CRM. Consulta clientes, vendas recentes e alertas comerciais do usuário autenticado. Todos os dados respeitam RLS — o cliente MCP só enxerga o que o usuário logado enxerga no app.",
  });

  registerListClients(server);
  registerListRecentSales(server);
  registerListAlerts(server);
  registerListOpportunities(server);
  registerListQuotes(server);

  return server;
}
