import { createFileRoute } from "@tanstack/react-router";

// RFC 9728 (OAuth 2.0 Protected Resource Metadata). Tells MCP clients that
// this resource's tokens are issued by Supabase Auth directly — this app is
// a resource server only, not an authorization server, so there is no token
// or authorize endpoint here.
export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const projectRef = process.env.VITE_SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID;
        if (!projectRef) {
          return new Response(
            JSON.stringify({ error: "server_error", error_description: "Supabase project ref não configurado" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        const resourceUrl = new URL("/mcp", request.url).toString();
        return new Response(
          JSON.stringify({
            resource: resourceUrl,
            authorization_servers: [`https://${projectRef}.supabase.co/auth/v1`],
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
