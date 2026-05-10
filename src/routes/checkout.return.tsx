import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {session_id ? (
            <>
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
              <p className="text-muted-foreground">
                Sua assinatura está sendo processada. Em alguns segundos sua equipe estará liberada.
              </p>
              <Button asChild className="w-full">
                <Link to="/dashboard">Ir para o painel</Link>
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Sessão não encontrada</h1>
              <Button asChild variant="outline">
                <Link to="/planos">Ver planos</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
