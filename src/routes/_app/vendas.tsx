import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { KpiCard } from "@/components/crm/KpiCard";
import { formatCurrency, formatPercent } from "@/utils/formatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subMonths, startOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getSalesSummary, getSalesPage } from "@/lib/sales.functions";

export const Route = createFileRoute("/_app/vendas")({ component: VendasPage });

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function VendasPage() {
  const [qInput, setQInput] = useState("");
  const q = useDebounced(qInput);
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);

  useEffect(() => { setPage(0); }, [q, period, pageSize]);

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = subMonths(now, i);
      options.push({ label: format(d, "MMMM yyyy", { locale: ptBR }), value: `month-${i}` });
    }
    return options;
  }, []);

  const filters = useMemo(() => {
    const now = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;
    if (period === "month") startDate = startOfMonth(now).toISOString().slice(0, 10);
    else if (period === "quarter") startDate = subMonths(now, 3).toISOString().slice(0, 10);
    else if (period === "semester") startDate = subMonths(now, 6).toISOString().slice(0, 10);
    else if (period.startsWith("month-")) {
      const off = parseInt(period.split("-")[1]);
      const s = startOfMonth(subMonths(now, off));
      startDate = s.toISOString().slice(0, 10);
      endDate = startOfMonth(subMonths(now, off - 1)).toISOString().slice(0, 10);
    }
    return { startDate, endDate, search: q || null };
  }, [period, q]);

  const summaryFn = useServerFn(getSalesSummary);
  const pageFn = useServerFn(getSalesPage);

  const summary = useQuery({
    queryKey: ["sales_summary", filters],
    queryFn: () => summaryFn({ data: filters }),
    placeholderData: keepPreviousData,
  });

  const pageQ = useQuery({
    queryKey: ["sales_page", filters, page, pageSize],
    queryFn: () => pageFn({ data: { ...filters, page, pageSize } }),
    placeholderData: keepPreviousData,
  });

  const isStaff = summary.data?.isStaff ?? pageQ.data?.isStaff ?? false;
  const s = summary.data;
  const rows = pageQ.data?.rows ?? [];
  const total = pageQ.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendas & Faturamento</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString("pt-BR")} notas no filtro
            {(summary.isFetching || pageQ.isFetching) && <Loader2 className="inline h-3 w-3 animate-spin ml-2" />}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[200px] bg-background">
              <Calendar className="mr-2 h-4 w-4 opacity-50" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="month">Mês Atual</SelectItem>
              <SelectItem value="quarter">Último Trimestre</SelectItem>
              <SelectItem value="semester">Último Semestre</SelectItem>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={`grid grid-cols-2 ${isStaff ? "md:grid-cols-5" : "md:grid-cols-3"} gap-3`}>
        <KpiCard label="Faturamento" value={formatCurrency(s?.totalRev ?? 0)} />
        {isStaff && <KpiCard label="MB CB" value={formatCurrency(s?.totalMB ?? 0)} sub={s?.totalRev ? formatPercent(((s.totalMB) / s.totalRev) * 100) : ""} />}
        {isStaff && <KpiCard label="ML CB" value={formatCurrency(s?.totalML ?? 0)} sub={s?.totalRev ? formatPercent(((s.totalML) / s.totalRev) * 100) : ""} />}
        <KpiCard label="Volume (sacos)" value={(s?.totalQty ?? 0).toLocaleString("pt-BR")} />
        <KpiCard label="Clientes" value={(s?.clients ?? 0).toString()} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <RankCard title="Por Linha" data={s?.byLine ?? []} />
        <RankCard title="Por Solução" data={s?.bySolution ?? []} />
        <RankCard title="Por Representante" data={s?.byRep ?? []} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cliente, produto, NF, representante..." value={qInput} onChange={(e) => setQInput(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Por página:</span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
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
              {pageQ.isLoading && <tr><td colSpan={isStaff ? 10 : 8} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!pageQ.isLoading && !rows.length && <tr><td colSpan={isStaff ? 10 : 8} className="p-8 text-center text-muted-foreground">Nenhuma venda encontrada</td></tr>}
              {rows.map((r: any, i: number) => (
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
        </div>
        <div className="flex items-center justify-between p-3 border-t text-xs">
          <span className="text-muted-foreground">
            Página {page + 1} de {totalPages} · {total.toLocaleString("pt-BR")} linhas
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RankCard({ title, data }: { title: string; data: Array<{ key: string; rev: number }> }) {
  const items = data.slice(0, 8);
  const max = Math.max(...items.map((i) => i.rev), 1);
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold text-muted-foreground mb-3">{title}</div>
      <div className="space-y-2">
        {items.map(({ key, rev }) => (
          <div key={key}>
            <div className="flex justify-between text-xs">
              <span className="truncate pr-2">{key}</span>
              <span className="font-mono">{formatCurrency(rev)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div className="h-full bg-primary" style={{ width: `${(rev / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {!items.length && <p className="text-xs text-muted-foreground">Sem dados no filtro.</p>}
      </div>
    </Card>
  );
}
