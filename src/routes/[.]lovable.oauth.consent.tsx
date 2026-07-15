import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OAuthClient = { name?: string; client_name?: string; redirect_uri?: string; redirect_uris?: string[] };
type AuthorizationDetails = {
  client?: OAuthClient;
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
  scope?: string;
};

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: any }>;
};
const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } as any });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-dvh grid place-items-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Não foi possível carregar a autorização</CardTitle>
          <CardDescription>{String((error as Error)?.message ?? error)}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.client_name ?? details?.client?.name ?? "aplicativo externo";
  const redirectUri =
    details?.client?.redirect_uri ?? details?.client?.redirect_uris?.[0] ?? "—";
  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(" ") : []);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message ?? "Erro ao processar a autorização.");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou uma URL de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-dvh grid place-items-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader>
          <CardTitle>Conectar {clientName} ao AgroGestão CRM</CardTitle>
          <CardDescription>
            {clientName} poderá usar as ferramentas do AgroGestão CRM em seu nome enquanto você
            estiver conectado. Isso não contorna as permissões nem as políticas do backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Redirect URI:</span>{" "}
              <span className="font-mono break-all">{redirectUri}</span>
            </div>
            {scopes.length > 0 && (
              <div>
                <span className="text-muted-foreground">Escopos solicitados:</span>{" "}
                <span className="font-mono">{scopes.join(", ")}</span>
              </div>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
              Recusar
            </Button>
            <Button disabled={busy} onClick={() => decide(true)}>
              {busy ? "Processando..." : "Aprovar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
