import { createFileRoute } from "@tanstack/react-router";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createAgroGestaoMcpServer } from "../lib/mcp/index";

// Stateless: one McpServer + transport per request, no session persistence.
// Simpler and safer for a read-only tool server with no server-initiated
// notifications — avoids needing a shared session store across requests.
async function handleMcpRequest(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : undefined;

  const server = createAgroGestaoMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  return transport.handleRequest(request, {
    authInfo: token
      ? { token, clientId: "agrogestao-crm-mcp", scopes: ["authenticated"] }
      : undefined,
  });
}

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      GET: ({ request }) => handleMcpRequest(request),
      POST: ({ request }) => handleMcpRequest(request),
      DELETE: ({ request }) => handleMcpRequest(request),
    },
  },
});
