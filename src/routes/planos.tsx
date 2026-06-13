import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ArrowLeft, ExternalLink, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { PLANS } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CHECKOUT_URL = "https://www.bpfconsult.com.br/agrogestao";

export const Route = createFileRoute("/planos")({
  component: PlanosPage,
  head: () => ({
    meta: [
      { title: "Planos e preços — AgroGestão CRM" },
      { name: "description", content: "Conheça os planos do AgroGestão CRM: Empresa, Gestor Comercial e Consultor Comercial, com opções mensal, semestral e anual." },
      { property: "og:title", content: "Planos e preços — AgroGestão CRM" },
      { property: "og:description", content: "Escolha o plano ideal do AgroGestão CRM para sua equipe comercial do agronegócio." },
      { property: "og:url", content: "https://regional-fixer-charm.lovable.app/planos" },
    ],
    links: [{ rel: "canonical", href: "https://regional-fixer-charm.lovable.app/planos" }],
    scripts: PLANS.flatMap((plan) =>
      plan.billing.map((b) => ({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: `AgroGestão CRM — ${plan.name} (${b.label})`,
          description: plan.description,
          brand: { "@type": "Brand", name: "AgroGestão CRM" },
          offers: {
            "@type": "Offer",
            price: b.price.replace(/[^\d,]/g, "").replace(".", "").replace(",", "."),
            priceCurrency: "BRL",
            url: "https://regional-fixer-charm.lovable.app/planos",
            availability: "https://schema.org/InStock",
          },
        }),
      })),
    ),
  }),
});

function PlanosPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [blockMsg, setBlockMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const m = sessionStorage.getItem("lvbl-access-block");
      if (m) { setBlockMsg(m); sessionStorage.removeItem("lvbl-access-block"); }
    } catch {}
  }, []);

  const handleSelect = () => {
    window.open(CHECKOUT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-dvh bg-background">
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: session ? "/dashboard" : "/login" })}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {blockMsg && (
          <div className="mb-8 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            <p className="text-sm font-medium">{blockMsg}</p>
          </div>
        )}


        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Escolha seu plano</h1>
          <p className="text-muted-foreground text-lg">
            Três opções de assinatura com descontos de até 25% no pagamento anual
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={plan.badge ? "border-primary shadow-lg relative" : "relative"}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{plan.badge}</Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <p className="text-sm font-medium text-primary">{plan.tagline}</p>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3 pt-2 border-t">
                  {plan.billing.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-baseline justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{b.label}</span>
                          {b.badge && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {b.badge}
                            </Badge>
                          )}
                        </div>
                        {b.note && <p className="text-xs text-muted-foreground">{b.note}</p>}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold leading-tight">{b.price}</div>
                        <div className="text-[11px] text-muted-foreground">{b.period}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button className="w-full" size="lg" onClick={handleSelect} disabled={loading}>
                  Assinar {plan.name}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          Os pagamentos são processados de forma segura pela BPF Consult via Paddle. Você será redirecionado para www.bpfconsult.com.br para concluir a assinatura.
        </p>
      </main>
    </div>
  );
}
