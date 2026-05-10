import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { generateInsights } from "@/lib/insights.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ia-insights")({ component: IAInsights });

function IAInsights() {
  const fn = useServerFn(generateInsights);
  const m = useMutation({
    mutationFn: () => fn({}),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar insights"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="size-6 text-primary" /> IA Insights
          </h1>
          <p className="text-sm text-muted-foreground">Análise automática dos seus dados de vendas, alertas e performance.</p>
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" />Analisando...</> : "Gerar insights agora"}
        </Button>
      </div>

      {!m.data && !m.isPending && (
        <Card><CardContent className="py-16 text-center">
          <Sparkles className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Clique em "Gerar insights agora" para analisar seus últimos 6 meses de dados.</p>
        </CardContent></Card>
      )}

      {m.data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Faturamento 6m" value={`R$ ${m.data.summary.total_revenue.toLocaleString("pt-BR")}`} />
            <KPI label="Representantes" value={m.data.summary.active_representatives} />
            <KPI label="Alertas" value={m.data.summary.alerts_count} />
            <KPI label="Alertas críticos" value={m.data.summary.alerts_by_severity?.high ?? 0} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {m.data.insights.map((ins: any, i: number) => (
              <Card key={i}>
                <CardHeader><CardTitle className="text-base flex items-center gap-2">
                  <span className="size-6 rounded-full bg-primary/10 grid place-items-center text-xs text-primary font-semibold">{i + 1}</span>
                  {ins.title}
                </CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{ins.analysis}</p>
                  <div className="border-l-2 border-primary pl-3">
                    <div className="text-xs font-semibold text-primary mb-1">RECOMENDAÇÃO</div>
                    <p>{ins.recommendation}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {m.data.insights.length === 0 && (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum insight gerado.</CardContent></Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: any }) {
  return <Card><CardContent className="pt-4">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-xl font-semibold mt-1">{value}</div>
  </CardContent></Card>;
}
