import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PLANS } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckoutForm } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/planos")({
  component: PlanosPage,
  head: () => ({
    meta: [
      { title: "Planos e preços — AgroGestão CRM" },
      { name: "description", content: "Conheça os planos do AgroGestão CRM e escolha a assinatura ideal para sua equipe comercial do agronegócio." },
      { property: "og:title", content: "Planos e preços — AgroGestão CRM" },
      { property: "og:description", content: "Escolha o plano ideal do AgroGestão CRM para sua equipe comercial do agronegócio." },
      { property: "og:url", content: "https://regional-fixer-charm.lovable.app/planos" },
    ],
    links: [{ rel: "canonical", href: "https://regional-fixer-charm.lovable.app/planos" }],
    scripts: PLANS.map((plan) => ({
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: `AgroGestão CRM — Plano ${plan.name}`,
        description: plan.description,
        brand: { "@type": "Brand", name: "AgroGestão CRM" },
        offers: {
          "@type": "Offer",
          price: plan.price.replace(/[^\d,]/g, "").replace(",", "."),
          priceCurrency: "BRL",
          url: "https://regional-fixer-charm.lovable.app/planos",
          availability: "https://schema.org/InStock",
        },
      }),
    })),
  }),
});

function PlanosPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  const handleSelect = (priceId: string) => {
    if (!session) {
      navigate({ to: "/login", search: { redirect: "/planos" } as any });
      return;
    }
    setSelectedPrice(priceId);
  };

  return (
    <div className="min-h-dvh bg-background">
      <PaymentTestModeBanner />
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: session ? "/dashboard" : "/login" })}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Escolha seu plano</h1>
          <p className="text-muted-foreground text-lg">
            Acesso completo à plataforma BPF Consult com até 20 representantes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card key={plan.id} className={plan.badge === 'MAIS ECONÔMICO' ? 'border-primary shadow-lg relative' : 'relative'}>
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{plan.badge}</Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="lg" onClick={() => handleSelect(plan.id)} disabled={loading}>
                  Assinar {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          Pagamento seguro processado pelo Stripe. Cancele quando quiser pelo portal do cliente.
        </p>
      </main>

      <Dialog open={!!selectedPrice} onOpenChange={(o) => !o && setSelectedPrice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar assinatura</DialogTitle>
          </DialogHeader>
          {selectedPrice && <StripeEmbeddedCheckoutForm priceId={selectedPrice} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
