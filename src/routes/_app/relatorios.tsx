import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { Download, BarChart3 } from "lucide-react";
import { KpiCard } from "@/components/crm/KpiCard";
import { formatCurrencyCompact } from "@/utils/formatters";

export const Route = createFileRoute("/_app/relatorios")({ component: Relatorios });

function Relatorios() {
  const [period, setPeriod] = useState("12");

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales-report", period],
    queryFn: async () => {
      const months = Number(period);
      const since = new Date();
      since.setMonth(since.getMonth() - months);
      const { data } = await supabase
        .from("sales_secure_view")
        .select("invoice_date, revenue, volume_sales, representative, rep_code, client_name, product_name")
        .gte("invoice_date", since.toISOString().slice(0, 10))
        .limit(10000);
      return data ?? [];
    },
  });

  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; volume: number }>();
    (sales ?? []).forEach((s) => {
      if (!s.invoice_date) return;
      const key = s.invoice_date.slice(0, 7);
      const cur = map.get(key) ?? { month: key, revenue: 0, volume: 0 };
      cur.revenue += Number(s.revenue ?? 0);
      cur.volume += Number(s.volume_sales ?? 0);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [sales]);

  const topReps = useMemo(() => {
    const map = new Map<string, number>();
    (sales ?? []).forEach((s) => {
      const k = s.representative ?? s.rep_code ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(s.revenue ?? 0));
    });
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [sales]);

  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    (sales ?? []).forEach((s) => {
      const k = s.client_name ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(s.revenue ?? 0));
    });
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [sales]);

  const total = monthly.reduce((s, m) => s + m.revenue, 0);

  function exportCSV() {
    const header = "month,revenue,volume\n";
    const rows = monthly.map((m) => `${m.month},${m.revenue},${m.volume}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-${period}m.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="size-6 text-primary" /> Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">Análise de vendas, representantes e clientes.</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="size-4 mr-2" />CSV</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0,1,2].map(i => <div key={i} className="h-20 rounded-lg bg-muted/40 animate-pulse" />)}
          </div>
          <div className="h-72 rounded-lg bg-muted/40 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-80 rounded-lg bg-muted/40 animate-pulse" />
            <div className="h-80 rounded-lg bg-muted/40 animate-pulse" />
          </div>
        </div>
      ) : (sales ?? []).length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Sem dados no período selecionado.</CardContent></Card>
      ) : (<>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Faturamento total" value={`R$ ${formatCurrencyCompact(total)}`} />
        <KpiCard label="Notas" value={(sales ?? []).length.toString()} />
        <KpiCard label="Volume total" value={formatCurrencyCompact(monthly.reduce((s, m) => s + m.volume, 0))} />
      </div>


      <Card>
        <CardHeader><CardTitle>Faturamento mensal</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
              <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Top 10 representantes</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topReps} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
                <Bar dataKey="revenue" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top 10 clientes</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClients} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
                <Bar dataKey="revenue" fill="var(--chart-2)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
