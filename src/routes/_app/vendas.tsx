import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { KpiCard } from "@/components/crm/KpiCard";
import { formatCurrency, formatPercent } from "@/utils/formatters";

export const Route = createFileRoute("/_app/vendas")({ component: VendasPage });

function VendasPage() {
  const { isStaff } = useAuth();
  const [q, setQ] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["sales_all", isStaff],
    queryFn: async () => {
      const table = isStaff ? "sales" : "sales_rep_view";
      const cols = isStaff
        ? "invoice_date, invoice_number, client_code, client_name, product_name, line, solution, subsolution, qty_bags, revenue, mb_cb_total, mb_cb_pct, ml_cb_total, commission_value, representative, branch, region, state, month_year"
        : "invoice_date, invoice_number, client_code, client_name, product_name, line, solution, subsolution, qty_bags, revenue, representative, branch, region, state, month_year";
      const { data, error } = await (supabase as any)
        .from(table)
        .select(cols)
        .order("invoice_date", { ascending: false, nullsFirst: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return rows;
    return rows.filter((r: any) =>
      [r.client_name, r.client_code, r.product_name, r.representative, r.invoice_number, r.line, r.solution]
        .some((v) => (v ?? "").toString().toLowerCase().includes(s))
    );
  }, [rows, q]);

  const k = useMemo(() => {
    const totalRev = filtered.reduce((a: number, r: any) => a + Number(r.revenue ?? 0), 0);
    const totalMB = filtered.reduce((a: number, r: any) => a + Number(r.mb_cb_total ?? 0), 0);
    const totalML = filtered.reduce((a: number, r: any) => a + Number(r.ml_cb_total ?? 0), 0);
    const totalQty = filtered.reduce((a: number, r: any) => a + Number(r.qty_bags ?? 0), 0);
    const clients = new Set(filtered.map((r: any) => r.client_code).filter(Boolean)).size;

    const byLine: Record<string, number> = {};
    filtered.forEach((r: any) => {
      const key = r.line || "—";
      byLine[key] = (byLine[key] ?? 0) + Number(r.revenue ?? 0);
    });
    const bySol: Record<string, number> = {};
    filtered.forEach((r: any) => {
      const key = r.solution || "—";
      bySol[key] = (bySol[key] ?? 0) + Number(r.revenue ?? 0);
    });
    const byRep: Record<string, number> = {};
    filtered.forEach((r: any) => {
      const key = r.representative || "—";
      byRep[key] = (byRep[key] ?? 0) + Number(r.revenue ?? 0);
    });
    return { totalRev, totalMB, totalML, totalQty, clients, byLine, bySol, byRep };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendas & Faturamento</h1>
          <p className="text-sm text-muted-foreground">{rows.length.toLocaleString("pt-BR")} notas no período</p>
        </div>
      </div>

      <div className={`grid grid-cols-2 ${isStaff ? "md:grid-cols-5" : "md:grid-cols-3"} gap-3`}>
        <KpiCard label="Faturamento" value={formatCurrency(k.totalRev)} />
        {isStaff && <KpiCard label="MB CB" value={formatCurrency(k.totalMB)} sub={k.totalRev ? formatPercent((k.totalMB / k.totalRev) * 100) : ""} />}
        {isStaff && <KpiCard label="ML CB" value={formatCurrency(k.totalML)} sub={k.totalRev ? formatPercent((k.totalML / k.totalRev) * 100) : ""} />}
        <KpiCard label="Volume (sacos)" value={k.totalQty.toLocaleString("pt-BR")} />
        <KpiCard label="Clientes" value={k.clients.toString()} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <RankCard title="Por Linha" data={k.byLine} />
        <RankCard title="Por Solução" data={k.bySol} />
        <RankCard title="Por Representante" data={k.byRep} />
      </div>

      <div className="relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar cliente, produto, NF, representante..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium">Data</th>
                <th className="text-left p-2 font-medium">NF</th>
                <th className="text-left p-2 font-medium">Cliente</th>
                <th className="text-left p-2 font-medium">Produto</th>
                <th className="text-left p-2 font-medium">Linha</th>
                <th className="text-right p-2 font-medium">Qtd</th>
                <th className="text-right p-2 font-medium">Faturamento</th>
                {isStaff && <th className="text-right p-2 font-medium">MB %</th>}
                {isStaff && <th className="text-right p-2 font-medium">MB</th>}
                <th className="text-left p-2 font-medium">RC</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={isStaff ? 10 : 8} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && !filtered.length && <tr><td colSpan={isStaff ? 10 : 8} className="p-8 text-center text-muted-foreground">Nenhuma venda encontrada</td></tr>}
              {filtered.slice(0, 500).map((r: any, i: number) => (
                <tr key={i} className="border-t hover:bg-muted/30">
                  <td className="p-2 whitespace-nowrap">{r.invoice_date ? new Date(r.invoice_date).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="p-2 font-mono">{r.invoice_number}</td>
                  <td className="p-2">{r.client_name}</td>
                  <td className="p-2">{r.product_name}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.line || "-"}</Badge></td>
                  <td className="p-2 text-right">{Number(r.qty_bags ?? 0).toLocaleString("pt-BR")}</td>
                  <td className="p-2 text-right">{formatCurrency(r.revenue)}</td>
                  {isStaff && <td className="p-2 text-right">{r.mb_cb_pct != null ? formatPercent(Number(r.mb_cb_pct) * 100) : "-"}</td>}
                  {isStaff && <td className="p-2 text-right">{formatCurrency(r.mb_cb_total)}</td>}
                  <td className="p-2 text-[11px]">{r.representative}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 500 && <p className="p-2 text-center text-xs text-muted-foreground">Mostrando 500 de {filtered.length} linhas. Refine a busca.</p>}
        </div>
      </Card>
    </div>
  );
}

function RankCard({ title, data }: { title: string; data: Record<string, number> }) {
  const items = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(...items.map(([, v]) => v), 1);
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold text-muted-foreground mb-3">{title}</div>
      <div className="space-y-2">
        {items.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-xs">
              <span className="truncate pr-2">{k}</span>
              <span className="font-mono">{formatCurrency(v)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div className="h-full bg-primary" style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

