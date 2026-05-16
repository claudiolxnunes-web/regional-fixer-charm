import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Briefcase, TrendingUp, Target, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { RepRanking } from "@/components/RepRanking";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [c, r, o, g] = await Promise.all([
        supabase.from("clients").select("id, total_purchases, type, status, abc_class"),
        supabase.from("representatives").select("id, status, total_sales"),
        supabase.from("opportunities").select("id, value, stage"),
        supabase.from("goals").select("id, target_value, current_value"),
      ]);
      const clients = c.data ?? [];
      const reps = r.data ?? [];
      const opps = o.data ?? [];
      const goals = g.data ?? [];
      const totalSales = clients.reduce((s, x) => s + Number(x.total_purchases ?? 0), 0);
      const oppsByStage = ["prospecting","qualification","proposal","negotiation","won"].map((st) => ({
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
        oppsByStage, abc,
        goalProgress: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0,
        totalTarget,
        totalCurrent
      };
    },
  });

  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu CRM</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Clientes" value={stats?.clientsCount ?? 0} icon={Building2} />
        <KPI title="Representantes" value={stats?.repsCount ?? 0} icon={Users} />
        <KPI title="Oportunidades" value={stats?.oppsCount ?? 0} icon={Briefcase} />
        <KPI title="Faturamento" value={`R$ ${(stats?.totalSales ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Funil de Oportunidades</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.oppsByStage ?? []}>
                <XAxis dataKey="stage" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--primary)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Classificação ABC</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.abc ?? []} dataKey="value" nameKey="name" outerRadius={90} label>
                  {(stats?.abc ?? []).map((_, i) => <Cell key={i} fill={colors[i]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
