import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"waiting" | "ready" | "timeout">(session_id ? "waiting" : "timeout");

  useEffect(() => {
    if (!session_id) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // ~40s

    const poll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: tm } = await supabase
        .from("team_members")
        .select("teams!inner(subscription_status)")
        .eq("user_id", user.id)
        .maybeSingle();
      const active = (tm as any)?.teams?.subscription_status === "active";
      if (active && !cancelled) {
        setStatus("ready");
        return true;
      }
      return false;
    };

    const tick = async () => {
      if (cancelled) return;
      attempts++;
      const done = await poll();
      if (done) return;
      if (attempts >= maxAttempts) { setStatus("timeout"); return; }
      setTimeout(tick, 2000);
    };
    tick();
    return () => { cancelled = true; };
  }, [session_id]);

  return (
    <div className="min-h-dvh grid place-items-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {!session_id ? (
            <>
              <h1 className="text-2xl font-bold">Sessão não encontrada</h1>
              <Button asChild variant="outline"><Link to="/planos">Ver planos</Link></Button>
            </>
          ) : status === "waiting" ? (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
              <h1 className="text-2xl font-bold">Confirmando pagamento…</h1>
              <p className="text-muted-foreground">Aguarde alguns segundos enquanto liberamos seu acesso.</p>
            </>
          ) : status === "ready" ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
              <p className="text-muted-foreground">Sua equipe está liberada.</p>
              <Button onClick={() => navigate({ to: "/dashboard" })} className="w-full">Ir para o painel</Button>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">Pagamento recebido</h1>
              <p className="text-muted-foreground">A liberação pode levar um instante. Tente acessar o painel; se aparecer "Planos", aguarde 30s e recarregue.</p>
              <Button onClick={() => navigate({ to: "/dashboard" })} className="w-full">Ir para o painel</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
