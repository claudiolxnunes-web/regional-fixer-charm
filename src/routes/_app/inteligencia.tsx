import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Trophy, Newspaper, Sparkles, UserCheck, AlertCircle, Calendar, ArrowRight, Target, ClipboardList, LayoutDashboard, BrainCircuit, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

import {
  forecastRevenue,
  benchmarkPeers,
  generateNarrative,
  getPositivationMetrics,
} from "@/lib/intelligence.functions";

export const Route = createFileRoute("/_app/inteligencia")({ component: Inteligencia });

const brl = (n: number) =>
  "R$ " + (n ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

function Inteligencia() {
  const [tab, setTab] = useState("narrative");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="size-6 text-primary" /> Inteligência Avançada
        </h1>
        <p className="text-sm text-muted-foreground">
          Estratégia comercial, positivação de carteira e previsões de alta performance.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full max-w-full overflow-x-auto justify-start bg-muted/50 p-1">
          <TabsTrigger value="narrative" className="gap-2"><Newspaper className="size-4" />Resumo Executivo</TabsTrigger>
          <TabsTrigger value="positivation" className="gap-2"><UserCheck className="size-4" />Positivação</TabsTrigger>
          <TabsTrigger value="forecast" className="gap-2"><TrendingUp className="size-4" />Previsão</TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-2"><Trophy className="size-4" />Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="narrative"><NarrativePanel /></TabsContent>
        <TabsContent value="positivation"><PositivationPanel /></TabsContent>
        <TabsContent value="forecast"><ForecastPanel /></TabsContent>
        <TabsContent value="benchmark"><BenchmarkPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function PositivationPanel() {
  const fn = useServerFn(getPositivationMetrics);
  const m = useMutation({
    mutationFn: () => fn({}),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao calcular positivação"),
  });

  // Auto-run on mount
  useEffect(() => {
    if (!m.data && !m.isPending && !m.isError) {
      m.mutate();
    }
  }, [m.data, m.isPending, m.isError, m.mutate]);

  return (
    <div className="space-y-4 mt-4">
      {m.isPending && (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analisando comportamento de compra da carteira...</p>
        </div>
      )}

      {m.data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase text-primary tracking-wider">Taxa de Positivação</div>
                  <UserCheck className="size-4 text-primary" />
                </div>
                <div className="text-3xl font-bold">{m.data.metrics.rate}%</div>
                <Progress value={m.data.metrics.rate} className="h-1.5 mt-3" />
                <p className="text-[10px] text-muted-foreground mt-2">
                  {m.data.metrics.positivated} de {m.data.metrics.totalActiveBase} clientes ativos
                </p>
              </CardContent>
            </Card>

            <KPI label="Potencial Recuperável" value={brl(m.data.metrics.potentialRevenue)} sub="Receita estimada dos não positivados" />
            <KPI label="Atraso Crítico (>60d)" value={m.data.metrics.critical} sub="Clientes em alto risco de churn" tone={m.data.metrics.critical > 0 ? "destructive" : "default"} />
            <KPI label="Em Atraso (35-60d)" value={m.data.metrics.delayed} sub="Oportunidades de positivação rápida" tone="warning" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Top Oportunidades de Positivação</CardTitle>
                  <p className="text-xs text-muted-foreground">Clientes com maior potencial de compra que ainda não compraram este mês.</p>
                </div>
                <Badge variant="outline">{m.data.gap.length} listados</Badge>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="text-left py-3">Cliente</th>
                        <th className="text-left">Status</th>
                        <th className="text-right">Última Compra</th>
                        <th className="text-right">Ticket Médio</th>
                        <th className="text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.data.gap.map((c: any) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3">
                            <div className="font-medium">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{c.rep}</div>
                          </td>
                          <td>
                            <Badge 
                              variant={c.status === "Crítico" ? "destructive" : c.status === "Atrasado" ? "warning" : "outline"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {c.status}
                            </Badge>
                          </td>
                          <td className="text-right text-xs">
                            <div className="font-medium">{c.daysSince} dias</div>
                            <div className="text-[10px] text-muted-foreground">{new Date(c.lastPurchase).toLocaleDateString('pt-BR')}</div>
                          </td>
                          <td className="text-right font-medium">{brl(c.avgMonthly)}</td>
                          <td className="text-right">
                            <Button size="icon" variant="ghost" className="size-8" title="Ver Detalhes">
                              <ArrowRight className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="size-4 text-amber-500" /> Insights Estratégicos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/40 p-3 border">
                  <div className="text-xs font-semibold mb-1">Impacto Financeiro</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sua positivação está em <span className="text-foreground font-medium">{m.data.metrics.rate}%</span>. 
                    Se alcançarmos 60%, o incremento de receita estimado é de <span className="text-emerald-600 font-bold">{brl(m.data.metrics.potentialRevenue * 0.5)}</span>.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold">Próximos Passos Recomendados:</div>
                  <ul className="text-xs space-y-2">
                    <li className="flex gap-2">
                      <div className="size-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 font-bold">1</div>
                      <span>Focar nos {m.data.metrics.delayed} clientes "Em Atraso" para fechamento imediato.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="size-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 font-bold">2</div>
                      <span>Revisar carteira dos {m.data.metrics.critical} clientes "Críticos" com os representantes.</span>
                    </li>
                    <li className="flex gap-2">
                      <div className="size-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 font-bold">3</div>
                      <span>Implementar campanha de reativação para tickets acima de {brl(5000)}.</span>
                    </li>
                  </ul>
                </div>

                <Button className="w-full text-xs" variant="outline" onClick={() => toast.info("Relatório de positivação enviado para os representantes.")}>
                  <Calendar className="size-3.5 mr-2" /> Notificar Força-Tarefa
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function NarrativePanel() {
  const fn = useServerFn(generateNarrative);
  const m = useMutation({
    mutationFn: () => fn({}),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar narrativa"),
  });

  return (
    <div className="space-y-4 mt-4">
      <Button onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" />Gerando...</> : "Gerar Resumo da Manhã"}
      </Button>

      {!m.data && !m.isPending && (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          Clique acima para que a IA gere uma narrativa executiva do seu negócio agora.
        </CardContent></Card>
      )}

      {m.data && (
        <>
          {m.data.headline && (
            <Card className="border-primary/40">
              <CardContent className="pt-5">
                <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">Manchete</div>
                <div className="text-lg font-semibold">{m.data.headline}</div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {m.data.win && <SnapCard label="Vitória" value={m.data.win} tone="success" />}
            {m.data.risk && <SnapCard label="Risco" value={m.data.risk} tone="warn" />}
            {m.data.action && <SnapCard label="Ação prioritária" value={m.data.action} tone="primary" />}
          </div>

          {m.data.narrative && (
            <Card>
              <CardHeader><CardTitle className="text-base">Narrativa</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap leading-relaxed">
                {m.data.narrative}
              </CardContent>
            </Card>
          )}

          {m.data.context && (
            <Card>
              <CardHeader><CardTitle className="text-base">Indicadores</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <KPI label="Faturamento MTD" value={brl(m.data.context.mtd_revenue)} />
                <KPI label="Mês anterior" value={brl(m.data.context.prev_month_revenue)} />
                <KPI label="Projeção fim de mês" value={brl(m.data.context.projection_end_of_month)} />
                <KPI label="Pipeline aberto" value={brl(m.data.context.pipeline_open)} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ForecastPanel() {
  const fn = useServerFn(forecastRevenue);
  const m = useMutation({
    mutationFn: () => fn({}),
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  return (
    <div className="space-y-4 mt-4">
      <Button onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" />Calculando...</> : "Calcular previsão"}
      </Button>

      {m.data && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Próximos 3 meses (total)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {m.data.forecast.map((f: any) => (
                <div key={f.month} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{f.month}</div>
                  <div className="text-lg font-semibold mt-1">{brl(f.predicted)}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Previsão por representante</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">Representante</th>
                      <th className="text-right">Último mês</th>
                      <th className="text-right">Próximo mês (previsto)</th>
                      <th className="text-right">Tendência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.data.reps.map((r: any) => (
                      <tr key={r.rep} className="border-b last:border-0">
                        <td className="py-2">{r.rep}</td>
                        <td className="text-right">{brl(r.last_month)}</td>
                        <td className="text-right font-medium">{brl(r.next_month)}</td>
                        <td className="text-right">
                          <Badge variant={r.trend_pct >= 0 ? "default" : "destructive"}>
                            {r.trend_pct >= 0 ? "+" : ""}{r.trend_pct}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function BenchmarkPanel() {
  const fn = useServerFn(benchmarkPeers);
  const m = useMutation({
    mutationFn: () => fn({}),
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  return (
    <div className="space-y-4 mt-4">
      <Button onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" />Comparando...</> : "Comparar representantes (últimos 90 dias)"}
      </Button>

      {m.data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Representantes" value={m.data.team.reps} />
            <KPI label="Receita média" value={brl(m.data.team.avg_revenue)} />
            <KPI label="Ticket médio" value={brl(m.data.team.avg_ticket)} />
            <KPI label="Margem média" value={`${m.data.team.avg_margin_pct}%`} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Ranking e gap-to-top</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">#</th>
                      <th className="text-left">Representante</th>
                      <th className="text-right">Receita</th>
                      <th className="text-right">Margem %</th>
                      <th className="text-right">Clientes</th>
                      <th className="text-right">Ticket</th>
                      <th className="text-right">vs. média</th>
                      <th className="text-right">Gap p/ topo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.data.rows.map((r: any) => (
                      <tr key={r.rep} className="border-b last:border-0">
                        <td className="py-2 font-medium">{r.rank}</td>
                        <td>{r.rep}</td>
                        <td className="text-right">{brl(r.revenue)}</td>
                        <td className="text-right">{r.margin_pct}%</td>
                        <td className="text-right">{r.clients}</td>
                        <td className="text-right">{brl(r.avg_ticket)}</td>
                        <td className="text-right">
                          <Badge variant={r.vs_avg_pct >= 0 ? "default" : "secondary"}>
                            {r.vs_avg_pct >= 0 ? "+" : ""}{r.vs_avg_pct}%
                          </Badge>
                        </td>
                        <td className="text-right text-muted-foreground">{r.gap_to_top > 0 ? brl(r.gap_to_top) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, sub, tone = "default" }: { label: string; value: any; sub?: string; tone?: "default" | "destructive" | "warning" | "success" }) {
  const toneCls = 
    tone === "destructive" ? "text-destructive" : 
    tone === "warning" ? "text-amber-600" : 
    tone === "success" ? "text-emerald-600" : 
    "";
  
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className={`text-xl font-bold mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{sub}</div>}
    </div>
  );
}

function SnapCard({ label, value, tone }: { label: string; value: string; tone: "success" | "warn" | "primary" }) {
  const cls =
    tone === "success" ? "border-emerald-500/40 bg-emerald-500/5" :
    tone === "warn" ? "border-amber-500/40 bg-amber-500/5" :
    "border-primary/40 bg-primary/5";
  return (
    <Card className={cls}>
      <CardContent className="pt-4">
        <div className="text-xs uppercase tracking-wide font-semibold mb-1 opacity-70">{label}</div>
        <div className="text-sm">{value}</div>
      </CardContent>
    </Card>
  );
}