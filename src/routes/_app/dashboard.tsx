import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, Target, PieChart as PieChartIcon, LayoutDashboard, Sparkles, Loader2, Trophy, Newspaper } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { RepRanking } from "@/components/RepRanking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyCompact } from "@/utils/formatters";
import type { DashboardStats } from "@/types/crm";
import { generateNarrative } from "@/lib/intelligence.functions";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [c, r, o, g] = await Promise.all([
        supabase.from("clients").select("id, total_purchases, type, status, abc_class"),
        supabase.from("representatives").select("id, status, total_sales"),
        supabase.from("opportunities").select("id, value, stage, probability"),
        supabase.from("goals").select("id, target_value, current_value"),
      ]);

      const clients = c.data ?? [];
      const reps = r.data ?? [];
      const opps = o.data ?? [];
      const goals = g.data ?? [];
      
      const totalSales = clients.reduce((s, x) => s + Number(x.total_purchases ?? 0), 0);
      const stages = ["prospecting","qualification","proposal","negotiation","won"];
      const oppsByStage = stages.map((st) => ({
        stage: st,
        value: opps.filter((o) => o.stage === st).reduce((s, x) => s + Number(x.value ?? 0), 0),
        count: opps.filter((o) => o.stage === st).length,
      }));
      const abc = ["A","B","C"].map((k) => ({ name: `Classe ${k}`, value: clients.filter((c) => c.abc_class === k).length }));
      const totalTarget = goals.reduce((s, x) => s + Number(x.target_value ?? 0), 0);
      const totalCurrent = goals.reduce((s, x) => s + Number(x.current_value ?? 0), 0);
      
      const weightedForecast = opps.reduce((s, x) => s + (Number(x.value ?? 0) * (Number(x.probability ?? 0) / 100)), 0);
      const wonOpps = opps.filter(o => o.stage === 'won');
      const conversionRate = opps.length > 0 ? (wonOpps.length / opps.length) * 100 : 0;

      return {
        clientsCount: clients.length,
        repsCount: reps.length,
        oppsCount: opps.length,
        totalSales,
        weightedForecast,
        conversionRate,
        oppsByStage, 
        abc,
        goalProgress: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0,
        totalTarget,
        totalCurrent
      };
    },
  });

  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

  const { isStaff } = useAuth();
  const generate = useServerFn(generateNarrative);
  const narrativeMut = useMutation({
    mutationFn: () => generate({}),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar narrativa"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="size-6 text-primary" /> Dashboard
          </h1>
          <p className="text-sm text-muted-foreground truncate">Visão geral do seu CRM</p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Button 
              size="sm" 
              className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
              variant="outline"
              onClick={() => narrativeMut.mutate()}
              disabled={narrativeMut.isPending}
            >
              {narrativeMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4 mr-1.5" />
              )}
              Resumo IA
            </Button>
          )}
          <Button size="sm" asChild variant="outline">
            <Link to="/inteligencia">
              <TrendingUp className="size-4 mr-1.5" /> Inteligência
            </Link>
          </Button>
        </div>
      </div>

      {narrativeMut.data && (
        <Card className="border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-top-2">
          <CardHeader className="pb-3 border-b border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-md">
                  <Newspaper className="size-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-semibold">Resumo Executivo Gerado pela IA</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-medium border-primary/20 text-primary">
                {narrativeMut.data.headline}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {narrativeMut.data.narrative}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <Trophy className="size-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Vitória</span>
                </div>
                <p className="text-xs font-medium">{narrativeMut.data.win}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Target className="size-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Risco</span>
                </div>
                <p className="text-xs font-medium">{narrativeMut.data.risk}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Sparkles className="size-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Ação</span>
                </div>
                <p className="text-xs font-medium">{narrativeMut.data.action}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Clientes" value={stats?.clientsCount ?? 0} icon={Building2} />
        <KPI title="Vendas Totais" value={`R$ ${formatCurrencyCompact(stats?.totalSales)}`} icon={TrendingUp} />
        <KPI title="Previsão (Ponderada)" value={`R$ ${formatCurrencyCompact(stats?.weightedForecast)}`} icon={Target} />
        <KPI title="Conversão" value={`${(stats?.conversionRate ?? 0).toFixed(1)}%`} icon={PieChartIcon} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium">Meta Mensal vs Realizado</CardTitle>
              <Badge variant={stats?.goalProgress && stats.goalProgress >= 100 ? "default" : "secondary"}>
                {stats?.goalProgress}% da meta
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>R$ {formatCurrencyCompact(stats?.totalCurrent)}</span>
                  <span className="text-muted-foreground">Alvo: R$ {formatCurrencyCompact(stats?.totalTarget)}</span>
                </div>
                <div className="h-4 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${Math.min(stats?.goalProgress ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Funil de Oportunidades</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.oppsByStage ?? []}>
                    <XAxis dataKey="stage" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--primary)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Classificação ABC</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats?.abc ?? []} dataKey="value" nameKey="name" outerRadius={70} label>
                      {(stats?.abc ?? []).map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <RepRanking />
        </div>
      </div>
    </div>
  );
}

function KPI({ title, value, icon: Icon }: { title: string; value: any; icon: any }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="text-2xl font-semibold mt-1">{value}</div>
          </div>
          <div className="size-10 rounded-lg bg-primary/10 grid place-items-center">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

