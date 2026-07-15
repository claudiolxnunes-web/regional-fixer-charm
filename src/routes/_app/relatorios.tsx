import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Download, BarChart3, Filter } from "lucide-react";
import { KpiCard } from "@/components/crm/KpiCard";
import { formatCurrencyCompact } from "@/utils/formatters";

export const Route = createFileRoute("/_app/relatorios")({ component: Relatorios });

type SaleRow = {
  invoice_date: string | null;
  revenue: number | null;
  volume_sales: number | null;
  representative: string | null;
  rep_code: string | null;
  client_name: string | null;
  client_id: string | null;
  product_name: string | null;
  line: string | null;
  product_group: string | null;
  state: string | null;
  city: string | null;
  invoice_number: string | null;
};

function MultiSelect({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[10rem]">
          <span className="flex items-center gap-2 truncate">
            <Filter className="size-3.5" />
            {label}
            {selected.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{selected.length}</Badge>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 max-h-80 overflow-auto p-2">
        {options.length === 0 ? (
          <div className="text-xs text-muted-foreground p-2">Nenhuma opção</div>
        ) : (
          <div className="space-y-1">
            {selected.length > 0 && (
              <button className="text-xs text-primary hover:underline mb-1 px-2" onClick={() => onChange([])}>Limpar</button>
            )}
            {options.map((o) => (
              <label key={o} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} />
                <span className="truncate">{o}</span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Relatorios() {
  const [period, setPeriod] = useState("12");
  const [selReps, setSelReps] = useState<string[]>([]);
  const [selStates, setSelStates] = useState<string[]>([]);
  const [selLines, setSelLines] = useState<string[]>([]);

  const { data: allSales, isLoading } = useQuery({
    queryKey: ["sales-report", period],
    queryFn: async () => {
      const months = Number(period);
      const since = new Date();
      since.setMonth(since.getMonth() - months);
      // extra 12m para comparativo YoY quando período >= 12m
      const sinceCompare = new Date(since);
      sinceCompare.setFullYear(sinceCompare.getFullYear() - 1);
      const cutoff = sinceCompare.toISOString().slice(0, 10);
      const out: SaleRow[] = [];
      const pageSize = 1000;
      let from = 0;
      // hard cap defensivo (500k linhas)
      while (from < 500_000) {
        const { data, error } = await supabase
          .from("sales_secure_view")
          .select("invoice_date, revenue, volume_sales, representative, rep_code, client_name, client_id, product_name, line, product_group, state, city, invoice_number")
          .gte("invoice_date", cutoff)
          .order("invoice_date", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = (data ?? []) as SaleRow[];
        out.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      return out;
    },
  });

  // Datas de corte
  const { periodStart, prevStart } = useMemo(() => {
    const months = Number(period);
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    const prev = new Date(start);
    prev.setFullYear(prev.getFullYear() - 1);
    return { periodStart: start.toISOString().slice(0, 10), prevStart: prev.toISOString().slice(0, 10) };
  }, [period]);

  // Opções de filtro derivadas do dataset do período atual
  const filterOptions = useMemo(() => {
    const reps = new Set<string>();
    const states = new Set<string>();
    const lines = new Set<string>();
    (allSales ?? []).forEach((s) => {
      if (!s.invoice_date || s.invoice_date < periodStart) return;
      if (s.representative) reps.add(s.representative);
      if (s.state) states.add(s.state);
      if (s.line) lines.add(s.line);
    });
    return {
      reps: Array.from(reps).sort(),
      states: Array.from(states).sort(),
      lines: Array.from(lines).sort(),
    };
  }, [allSales, periodStart]);

  // Aplicar filtros (rep/uf/linha) — mantém tudo (inclui janela YoY) para comparativo
  const matchesFilters = (s: SaleRow) => {
    if (selReps.length && !(s.representative && selReps.includes(s.representative))) return false;
    if (selStates.length && !(s.state && selStates.includes(s.state))) return false;
    if (selLines.length && !(s.line && selLines.includes(s.line))) return false;
    return true;
  };

  const filtered = useMemo(() => (allSales ?? []).filter(matchesFilters), [allSales, selReps, selStates, selLines]);

  // Linhas do período atual (para KPIs, gráficos gerais)
  const current = useMemo(
    () => filtered.filter((s) => s.invoice_date && s.invoice_date >= periodStart),
    [filtered, periodStart],
  );

  // Linhas do período anterior de MESMA duração (para variação)
  const previous = useMemo(
    () => filtered.filter((s) => s.invoice_date && s.invoice_date >= prevStart && s.invoice_date < periodStart),
    [filtered, prevStart, periodStart],
  );

  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; volume: number }>();
    current.forEach((s) => {
      if (!s.invoice_date) return;
      const key = s.invoice_date.slice(0, 7);
      const cur = map.get(key) ?? { month: key, revenue: 0, volume: 0 };
      cur.revenue += Number(s.revenue ?? 0);
      cur.volume += Number(s.volume_sales ?? 0);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [current]);

  const topReps = useMemo(() => {
    const map = new Map<string, number>();
    current.forEach((s) => {
      const k = s.representative ?? s.rep_code ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(s.revenue ?? 0));
    });
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [current]);

  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    current.forEach((s) => {
      const k = s.client_name ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(s.revenue ?? 0));
    });
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [current]);

  const byLine = useMemo(() => {
    const map = new Map<string, number>();
    current.forEach((s) => {
      const k = s.line ?? s.product_group ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(s.revenue ?? 0));
    });
    const arr = Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const total = arr.reduce((s, x) => s + x.revenue, 0) || 1;
    return arr.map((x) => ({ ...x, pct: (x.revenue / total) * 100 }));
  }, [current]);

  const byState = useMemo(() => {
    const map = new Map<string, number>();
    current.forEach((s) => {
      const k = s.state ?? "—";
      map.set(k, (map.get(k) ?? 0) + Number(s.revenue ?? 0));
    });
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [current]);

  // YoY: mesmo mês/ano-anterior — apenas quando período >= 12m
  const yoy = useMemo(() => {
    if (Number(period) < 12) return [];
    const cur = new Map<string, number>();
    const prev = new Map<string, number>();
    current.forEach((s) => {
      if (!s.invoice_date) return;
      const k = s.invoice_date.slice(5, 7); // MM
      cur.set(k, (cur.get(k) ?? 0) + Number(s.revenue ?? 0));
    });
    previous.forEach((s) => {
      if (!s.invoice_date) return;
      const k = s.invoice_date.slice(5, 7);
      prev.set(k, (prev.get(k) ?? 0) + Number(s.revenue ?? 0));
    });
    const months = ["01","02","03","04","05","06","07","08","09","10","11","12"];
    return months.map((m) => ({ month: m, atual: cur.get(m) ?? 0, anterior: prev.get(m) ?? 0 }));
  }, [current, previous, period]);

  // KPIs
  const totalRevenue = current.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
  const totalVolume = current.reduce((s, r) => s + Number(r.volume_sales ?? 0), 0);
  const invoiceCount = new Set(current.map((s) => s.invoice_number).filter(Boolean)).size || current.length;
  const activeClients = new Set(current.map((s) => s.client_id ?? s.client_name).filter(Boolean)).size;
  const avgTicket = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;
  const prevRevenue = previous.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
  const yoyPct = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;

  function exportMonthlyCSV() {
    const header = "month,revenue,volume\n";
    const rows = monthly.map((m) => `${m.month},${m.revenue},${m.volume}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-mensal-${period}m.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportDetailedCSV() {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = "data,cliente,representante,linha,produto,uf,cidade,volume,receita\n";
    const rows = current.map((s) => [
      s.invoice_date, s.client_name, s.representative ?? s.rep_code,
      s.line ?? s.product_group, s.product_name, s.state, s.city,
      Number(s.volume_sales ?? 0), Number(s.revenue ?? 0),
    ].map(esc).join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-detalhado-${period}m.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const hasFilters = selReps.length + selStates.length + selLines.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="size-6 text-primary" /> Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">Análise de vendas, representantes, clientes, linha e UF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          <MultiSelect label="Rep." options={filterOptions.reps} selected={selReps} onChange={setSelReps} />
          <MultiSelect label="UF" options={filterOptions.states} selected={selStates} onChange={setSelStates} />
          <MultiSelect label="Linha" options={filterOptions.lines} selected={selLines} onChange={setSelLines} />
          <Button variant="outline" onClick={exportMonthlyCSV}><Download className="size-4 mr-2" />Mensal</Button>
          <Button variant="outline" onClick={exportDetailedCSV}><Download className="size-4 mr-2" />Detalhado</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[0,1,2,3,4].map(i => <div key={i} className="h-20 rounded-lg bg-muted/40 animate-pulse" />)}
          </div>
          <div className="h-72 rounded-lg bg-muted/40 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-80 rounded-lg bg-muted/40 animate-pulse" />
            <div className="h-80 rounded-lg bg-muted/40 animate-pulse" />
          </div>
        </div>
      ) : current.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {hasFilters ? "Nenhum dado para os filtros atuais." : "Sem dados no período selecionado."}
          </CardContent>
        </Card>
      ) : (<>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Faturamento" value={`R$ ${formatCurrencyCompact(totalRevenue)}`} />
          <KpiCard label="Notas" value={invoiceCount.toLocaleString("pt-BR")} />
          <KpiCard label="Ticket médio" value={`R$ ${formatCurrencyCompact(avgTicket)}`} />
          <KpiCard label="Clientes ativos" value={activeClients.toLocaleString("pt-BR")} />
          <KpiCard
            label="Var. vs período ant."
            value={yoyPct == null ? "—" : `${yoyPct >= 0 ? "+" : ""}${yoyPct.toFixed(1)}%`}
          />
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

        {yoy.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Comparativo mensal — atual vs ano anterior</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yoy}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
                  <Legend />
                  <Line type="monotone" dataKey="atual" stroke="var(--primary)" strokeWidth={2} />
                  <Line type="monotone" dataKey="anterior" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Mix por linha de produto</span>
                <span className="text-xs font-normal text-muted-foreground">Clique numa barra para filtrar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byLine}
                  layout="vertical"
                  margin={{ left: 80 }}
                  onClick={(e: any) => {
                    const name = e?.activePayload?.[0]?.payload?.name;
                    if (!name || name === "—") return;
                    setSelLines(selLines.includes(name) ? selLines.filter((x) => x !== name) : [...selLines, name]);
                  }}
                >
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip
                    formatter={(v: any, _n, p: any) =>
                      [`R$ ${Number(v).toLocaleString("pt-BR")} (${p.payload.pct.toFixed(1)}%)`, "Receita"]
                    }
                  />
                  <Bar dataKey="revenue" fill="var(--chart-3, var(--primary))" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Faturamento por UF</span>
                <span className="text-xs font-normal text-muted-foreground">Clique numa barra para filtrar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byState}
                  onClick={(e: any) => {
                    const name = e?.activePayload?.[0]?.payload?.name;
                    if (!name || name === "—") return;
                    setSelStates(selStates.includes(name) ? selStates.filter((x) => x !== name) : [...selStates, name]);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
                  <Bar dataKey="revenue" fill="var(--chart-4, var(--primary))" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          Dados agregados a partir de {current.length.toLocaleString("pt-BR")} linhas de venda no período{hasFilters ? " (com filtros aplicados)" : ""}. Volume em kg.
        </p>
      </>)}
    </div>
  );
}
