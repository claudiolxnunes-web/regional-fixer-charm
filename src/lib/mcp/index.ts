import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClients from "./tools/list_clients";
import listRecentSales from "./tools/list_recent_sales";
import listAlerts from "./tools/list_alerts";
import listOpportunities from "./tools/list_opportunities";
import listQuotes from "./tools/list_quotes";

// The OAuth issuer MUST be the direct Supabase host (RFC 8414 issuer match).
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "agrogestao-crm-mcp",
  title: "AgroGestão CRM",
  version: "0.1.0",
  instructions:
    "Ferramentas do AgroGestão CRM. Consulta clientes, vendas recentes e alertas comerciais do usuário autenticado. Todos os dados respeitam RLS — o cliente MCP só enxerga o que o usuário logado enxerga no app.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClients, listRecentSales, listAlerts, listOpportunities, listQuotes],
});
