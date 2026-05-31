import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_app/analytics")({ component: Analytics });

function Analytics() {
  const { data: sales, isLoading } = useQuery({
    queryKey: ["analytics-sales"],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 12);
      return (await supabase.from("sales_secure_view")
        .select("invoice_date, revenue, volume_sales, line, product_group, state, region")
        .gte("invoice_date", since.toISOString().slice(0, 10))
        .limit(10000)).data ?? [];
    },
  });

  const { weekly, byLine, byState, byRegion } = useMemo(() => {
    const w = new Map<string, number>();
    const l = new Map<string, number>();
    const st = new Map<string, number>();
    const r = new Map<string, number>();
    (sales ?? []).forEach((s) => {
      if (s.invoice_date) {
        const d = new Date(s.invoice_date);
        const onejan = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
        const key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
        w.set(key, (w.get(key) ?? 0) + Number(s.revenue ?? 0));
      }
      const lk = s.line ?? "—"; l.set(lk, (l.get(lk) ?? 0) + Number(s.revenue ?? 0));
      const sk = s.state ?? "—"; st.set(sk, (st.get(sk) ?? 0) + Number(s.revenue ?? 0));
      const rk = s.region ?? "—"; r.set(rk, (r.get(rk) ?? 0) + Number(s.revenue ?? 0));
    });
    return {
      weekly: Array.from(w.entries()).map(([week, revenue]) => ({ week, revenue })).sort((a, b) => a.week.localeCompare(b.week)).slice(-26),
      byLine: Array.from(l.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      byState: Array.from(st.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      byRegion: Array.from(r.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }, [sales]);

  const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics Avançada</h1>
        <p className="text-sm text-muted-foreground">Tendências, mix de produtos e distribuição geográfica.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Tendência semanal (últimas 26 semanas)</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekly}>
              <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
              </linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" fontSize={10} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
              <Area dataKey="revenue" stroke="var(--primary)" fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Mix por linha</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byLine} dataKey="value" nameKey="name" outerRadius={100} label={(e) => e.name}>
                  {byLine.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top estados</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byState}>
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
                <Bar dataKey="value" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Distribuição por região</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byRegion} dataKey="value" nameKey="name" outerRadius={90} label>
                {byRegion.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
