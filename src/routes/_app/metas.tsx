import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Target, TrendingUp, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { GoalsImportDialog } from "@/components/GoalsImportDialog";
import { KpiCard } from "@/components/crm/KpiCard";
import { formatCurrencyCompact } from "@/utils/formatters";

export const Route = createFileRoute("/_app/metas")({ component: MetasPage });

const fmt = (v: any) => Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtV = (v: any) => Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type Goal = {
  id: string;
  representative_code: string;
  representative_name: string;
  year: number;
  month: number;
  line: string | null;
  solution: string | null;
  subsolution: string | null;
  revenue_target: number;
  volume_target: number;
};

function MetasPage() {
  const { isStaff } = useAuth();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goal_targets", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goal_targets")
        .select("id, representative_code, representative_name, year, month, line, solution, subsolution, revenue_target, volume_target")
        .eq("year", year)
        .order("representative_name");
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
  });

  // available years
  const { data: years = [] } = useQuery({
    queryKey: ["goal_target_years"],
    queryFn: async () => {
      const { data, error } = await supabase.from("goal_targets").select("year");
      if (error) throw error;
      const arr = Array.from(new Set((data ?? []).map((d: any) => d.year))).sort((a, b) => b - a);
      return arr.length ? arr : [new Date().getFullYear()];
    },
  });

  const grouped = useMemo(() => {
    const byRep = new Map<string, { name: string; code: string; rows: Goal[] }>();
    for (const g of goals) {
      const k = g.representative_code || g.representative_name;
      if (!byRep.has(k)) byRep.set(k, { name: g.representative_name, code: g.representative_code, rows: [] });
      byRep.get(k)!.rows.push(g);
    }
    return Array.from(byRep.values()).map((r) => {
      const monthly = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        revenue: r.rows.filter((x) => x.month === i + 1).reduce((a, x) => a + Number(x.revenue_target || 0), 0),
        volume: r.rows.filter((x) => x.month === i + 1).reduce((a, x) => a + Number(x.volume_target || 0), 0),
      }));
      const totalRev = monthly.reduce((a, m) => a + m.revenue, 0);
      const totalVol = monthly.reduce((a, m) => a + m.volume, 0);
      return { ...r, monthly, totalRev, totalVol };
    }).sort((a, b) => b.totalRev - a.totalRev);
  }, [goals]);

  const totalRev = grouped.reduce((a, g) => a + g.totalRev, 0);
  const totalVol = grouped.reduce((a, g) => a + g.totalVol, 0);

  function toggle(code: string) {
    const next = new Set(expanded);
    if (next.has(code)) next.delete(code); else next.add(code);
    setExpanded(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Trophy className="size-6 text-primary" /> Metas
          </h1>
          <p className="text-sm text-muted-foreground">
            Faturamento e volume por representante, mês e desdobrados em linha, solução e subsolução.
          </p>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Ano</label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isStaff && <GoalsImportDialog />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Target className="size-4" />} label="Representantes" value={grouped.length.toString()} />
        <Kpi icon={<TrendingUp className="size-4" />} label="Meta de Faturamento" value={`R$ ${fmt(totalRev)}`} />
        <Kpi icon={<TrendingUp className="size-4" />} label="Meta de Volume (kg)" value={fmtV(totalVol)} />
        <Kpi icon={<Target className="size-4" />} label="Linhas de meta" value={goals.length.toString()} />
      </div>

      {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando...</Card>}
      {!isLoading && !grouped.length && (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma meta cadastrada para {year}. {isStaff && "Use \"Importar Excel\" acima."}
        </Card>
      )}

      <div className="space-y-2">
        {grouped.map((rep) => {
          const isOpen = expanded.has(rep.code);
          return (
            <Card key={rep.code} className="overflow-hidden">
              <button
                onClick={() => toggle(rep.code)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
              >
                {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{rep.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{rep.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">R$ {fmt(rep.totalRev)}</div>
                  <div className="text-xs text-muted-foreground">{fmtV(rep.totalVol)} kg</div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t bg-muted/10">
                  {/* Monthly summary strip */}
                  <div className="grid grid-cols-6 md:grid-cols-12 gap-1 p-3">
                    {rep.monthly.map((m) => (
                      <div key={m.month} className="text-center bg-background rounded p-1.5 border">
                        <div className="text-[10px] uppercase text-muted-foreground">{MONTH_NAMES[m.month - 1]}</div>
                        <div className="text-[11px] font-semibold mt-0.5">{fmt(m.revenue / 1000)}k</div>
                        <div className="text-[10px] text-muted-foreground">{fmtV(m.volume / 1000)}t</div>
                      </div>
                    ))}
                  </div>
                  {/* Breakdown by month */}
                  <BreakdownTable rows={rep.rows} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function BreakdownTable({ rows }: { rows: Goal[] }) {
  // group by line > solution > subsolution → 12 months
  const map = new Map<string, { line: string; solution: string; subsolution: string; months: number[]; vols: number[] }>();
  for (const r of rows) {
    const key = `${r.line}|${r.solution}|${r.subsolution}`;
    if (!map.has(key)) {
      map.set(key, {
        line: r.line || "—",
        solution: r.solution || "—",
        subsolution: r.subsolution || "—",
        months: Array(12).fill(0),
        vols: Array(12).fill(0),
      });
    }
    const e = map.get(key)!;
    e.months[r.month - 1] += Number(r.revenue_target || 0);
    e.vols[r.month - 1] += Number(r.volume_target || 0);
  }
  const items = Array.from(map.values()).sort((a, b) => {
    return a.line.localeCompare(b.line) || a.solution.localeCompare(b.solution) || a.subsolution.localeCompare(b.subsolution);
  });

  const [view, setView] = useState<"rev" | "vol">("rev");

  return (
    <div>
      <div className="px-3 py-2 border-t flex items-center gap-2">
        <Button size="sm" variant={view === "rev" ? "default" : "outline"} onClick={() => setView("rev")}>Faturamento</Button>
        <Button size="sm" variant={view === "vol" ? "default" : "outline"} onClick={() => setView("vol")}>Volume (kg)</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2">Linha</th>
              <th className="text-left p-2">Solução</th>
              <th className="text-left p-2">Subsolução</th>
              {MONTH_NAMES.map((m) => <th key={m} className="text-right p-2">{m}</th>)}
              <th className="text-right p-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => {
              const data = view === "rev" ? it.months : it.vols;
              const total = data.reduce((a, b) => a + b, 0);
              return (
                <tr key={i} className="border-t hover:bg-muted/20">
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{it.line}</Badge></td>
                  <td className="p-2">{it.solution}</td>
                  <td className="p-2">{it.subsolution}</td>
                  {data.map((v, j) => <td key={j} className="p-2 text-right font-mono">{v ? fmt(v) : "-"}</td>)}
                  <td className="p-2 text-right font-mono font-semibold">{fmt(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
