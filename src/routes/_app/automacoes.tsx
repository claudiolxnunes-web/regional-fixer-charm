import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, Play, Loader2, CheckCircle2, Zap } from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/crm/KpiCard";

export const Route = createFileRoute("/_app/automacoes")({ component: Automacoes });

const RULES = [
  { type: "consumption_drop", title: "Queda de consumo", desc: "Detecta clientes com queda significativa de faturamento comparando janelas." },
  { type: "low_stock", title: "Estoque baixo", desc: "Identifica clientes que ultrapassaram o intervalo médio de compra." },
  { type: "inactive_client", title: "Cliente inativo", desc: "Sinaliza clientes sem compras há vários meses." },
  { type: "goal_at_risk", title: "Meta em risco", desc: "Alerta representantes que estão abaixo do ritmo esperado." },
  { type: "quote_expiring", title: "Proposta vencendo", desc: "Avisa propostas pendentes próximas do vencimento." },
];

function Automacoes() {
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["automacoes-stats"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 7);
      const { data } = await supabase.from("alerts").select("type, created_at, severity")
        .gte("created_at", since.toISOString()).limit(2000);
      const byType: Record<string, number> = {};
      (data ?? []).forEach((a) => { byType[a.type] = (byType[a.type] ?? 0) + 1; });
      return { total: data?.length ?? 0, byType };
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["alert-settings-list"],
    queryFn: async () => (await supabase.from("alert_settings").select("rule_type, config, updated_at")).data ?? [],
  });

  const run = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("generate_all_alerts");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Geradas ${data?.total ?? 0} novas alertas`);
      qc.invalidateQueries({ queryKey: ["automacoes-stats"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao executar"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Bot className="size-6 text-primary" /> Automações
          </h1>
          <p className="text-sm text-muted-foreground">Regras automáticas que monitoram seus dados e geram alertas.</p>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" />Executando...</> : <><Play className="size-4 mr-2" />Executar todas agora</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">Alertas (7 dias)</div>
          <div className="text-2xl font-semibold mt-1">{stats?.total ?? 0}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">Regras ativas</div>
          <div className="text-2xl font-semibold mt-1">{RULES.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <Clock className="size-5 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Frequência</div>
            <div className="text-sm font-medium mt-1">Cron diário (servidor)</div>
          </div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RULES.map((r) => {
          const cfg = settings?.find((s) => s.rule_type === r.type);
          const count = stats?.byType?.[r.type] ?? 0;
          return (
            <Card key={r.type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />{r.title}</span>
                  <Badge variant="secondary">{count} em 7d</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{r.desc}</p>
                {cfg && (
                  <div className="text-xs bg-muted rounded-md p-2 font-mono break-all">
                    {JSON.stringify(cfg.config)}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Configure thresholds em <a href="/alertas/config" className="text-primary underline">Config. Alertas</a>.
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
