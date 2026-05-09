import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3 } from "lucide-react";
import { useState } from "react";

const fmt = (v: any) => Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type Props = {
  repCode: string | null;
  repName: string;
  showMargins?: boolean;
};

export function RepBreakdownDialog({ repCode, repName, showMargins }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Ver dinâmica">
          <BarChart3 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dinâmica — {repName}</DialogTitle>
        </DialogHeader>
        {open && <Body repCode={repCode} showMargins={showMargins} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ repCode, showMargins }: { repCode: string | null; showMargins?: boolean }) {
  // Sales for this rep — by code or name
  const { data: sales = [] } = useQuery({
    queryKey: ["rep_sales_breakdown", repCode],
    enabled: !!repCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("line, solution, subsolution, revenue, mb_cb_total, volume_sales, qty_bags, invoice_date, month_year")
        .eq("rep_code", repCode!)
        .limit(10000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["rep_goals_breakdown", repCode],
    enabled: !!repCode,
    queryFn: async () => {
      const code = (repCode || "").padStart(6, "0");
      const { data, error } = await supabase
        .from("goal_targets")
        .select("year, month, line, solution, subsolution, revenue_target, volume_target")
        .eq("representative_code", code);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalRev = sales.reduce((a: number, r: any) => a + Number(r.revenue || 0), 0);
  const totalMB = sales.reduce((a: number, r: any) => a + Number(r.mb_cb_total || 0), 0);
  const totalVol = sales.reduce((a: number, r: any) => a + Number(r.volume_sales || 0), 0);
  const totalGoalRev = goals.reduce((a: number, r: any) => a + Number(r.revenue_target || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Realizado (R$)" value={`R$ ${fmt(totalRev)}`} />
        <Kpi label="Meta anual (R$)" value={`R$ ${fmt(totalGoalRev)}`} sub={totalGoalRev ? `${((totalRev / totalGoalRev) * 100).toFixed(1)}% atingido` : ""} />
        {showMargins && <Kpi label="MB CB" value={`R$ ${fmt(totalMB)}`} sub={totalRev ? `${((totalMB / totalRev) * 100).toFixed(1)}%` : ""} />}
        <Kpi label="Volume (kg)" value={fmt(totalVol)} />
      </div>

      <Tabs defaultValue="line">
        <TabsList>
          <TabsTrigger value="line">Por Linha</TabsTrigger>
          <TabsTrigger value="solution">Por Solução</TabsTrigger>
          <TabsTrigger value="subsolution">Por Subsolução</TabsTrigger>
          <TabsTrigger value="month">Por Mês</TabsTrigger>
        </TabsList>
        <TabsContent value="line"><BreakdownGroup data={sales} field="line" goals={goals} showMargins={showMargins} /></TabsContent>
        <TabsContent value="solution"><BreakdownGroup data={sales} field="solution" goals={goals} showMargins={showMargins} /></TabsContent>
        <TabsContent value="subsolution"><BreakdownGroup data={sales} field="subsolution" goals={goals} showMargins={showMargins} /></TabsContent>
        <TabsContent value="month"><MonthlyTable sales={sales} goals={goals} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function BreakdownGroup({ data, field, goals, showMargins }: { data: any[]; field: "line" | "solution" | "subsolution"; goals: any[]; showMargins?: boolean }) {
  const map = new Map<string, { rev: number; vol: number; mb: number; goal: number }>();
  for (const r of data) {
    const k = r[field] || "—";
    const e = map.get(k) || { rev: 0, vol: 0, mb: 0, goal: 0 };
    e.rev += Number(r.revenue || 0);
    e.vol += Number(r.volume_sales || 0);
    e.mb += Number(r.mb_cb_total || 0);
    map.set(k, e);
  }
  for (const g of goals) {
    const k = g[field] || "—";
    const e = map.get(k) || { rev: 0, vol: 0, mb: 0, goal: 0 };
    e.goal += Number(g.revenue_target || 0);
    map.set(k, e);
  }
  const items = Array.from(map.entries()).sort((a, b) => b[1].rev - a[1].rev);

  return (
    <Card>
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="text-left p-2">{field === "line" ? "Linha" : field === "solution" ? "Solução" : "Subsolução"}</th>
            <th className="text-right p-2">Realizado</th>
            <th className="text-right p-2">Meta</th>
            <th className="text-right p-2">% Ating.</th>
            {showMargins && <th className="text-right p-2">MB</th>}
            <th className="text-right p-2">Volume</th>
          </tr>
        </thead>
        <tbody>
          {!items.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sem dados</td></tr>}
          {items.map(([k, v]) => (
            <tr key={k} className="border-t hover:bg-muted/20">
              <td className="p-2"><Badge variant="outline" className="text-[10px]">{k}</Badge></td>
              <td className="p-2 text-right font-mono">R$ {fmt(v.rev)}</td>
              <td className="p-2 text-right font-mono text-muted-foreground">R$ {fmt(v.goal)}</td>
              <td className="p-2 text-right font-mono">{v.goal ? `${((v.rev / v.goal) * 100).toFixed(1)}%` : "-"}</td>
              {showMargins && <td className="p-2 text-right font-mono">R$ {fmt(v.mb)}</td>}
              <td className="p-2 text-right font-mono">{fmt(v.vol)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function MonthlyTable({ sales, goals }: { sales: any[]; goals: any[] }) {
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const real = sales
      .filter((r) => r.invoice_date && new Date(r.invoice_date).getMonth() + 1 === m)
      .reduce((a, r) => a + Number(r.revenue || 0), 0);
    const goal = goals.filter((g) => g.month === m).reduce((a, g) => a + Number(g.revenue_target || 0), 0);
    return { month: m, real, goal };
  });
  return (
    <Card>
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="text-left p-2">Mês</th>
            <th className="text-right p-2">Realizado</th>
            <th className="text-right p-2">Meta</th>
            <th className="text-right p-2">% Ating.</th>
          </tr>
        </thead>
        <tbody>
          {monthly.map((m) => (
            <tr key={m.month} className="border-t">
              <td className="p-2">{MONTH_NAMES[m.month - 1]}</td>
              <td className="p-2 text-right font-mono">R$ {fmt(m.real)}</td>
              <td className="p-2 text-right font-mono text-muted-foreground">R$ {fmt(m.goal)}</td>
              <td className="p-2 text-right font-mono">{m.goal ? `${((m.real / m.goal) * 100).toFixed(1)}%` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
