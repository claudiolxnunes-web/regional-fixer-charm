import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Trophy, Newspaper, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  forecastRevenue,
  benchmarkPeers,
  generateNarrative,
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
          Narrativa executiva, previsão de receita e benchmark entre representantes.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full max-w-full overflow-x-auto justify-start">
          <TabsTrigger value="narrative"><Newspaper className="size-4 mr-1.5" />Resumo</TabsTrigger>
          <TabsTrigger value="forecast"><TrendingUp className="size-4 mr-1.5" />Previsão</TabsTrigger>
          <TabsTrigger value="benchmark"><Trophy className="size-4 mr-1.5" />Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="narrative"><NarrativePanel /></TabsContent>
        <TabsContent value="forecast"><ForecastPanel /></TabsContent>
        <TabsContent value="benchmark"><BenchmarkPanel /></TabsContent>
      </Tabs>
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

function KPI({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mt-1">{value}</div>
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
