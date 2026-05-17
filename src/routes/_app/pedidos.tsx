import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { KpiCard } from "@/components/crm/KpiCard";
import { formatCurrency } from "@/utils/formatters";

export const Route = createFileRoute("/_app/pedidos")({ component: PedidosPage });

function statusVariant(s: string | null | undefined): any {
  if (!s) return "outline";
  const x = s.toLowerCase();
  if (x.includes("bloque")) return "destructive";
  if (x.includes("fatur")) return "default";
  if (x.includes("liber") || x.includes("ok")) return "default";
  return "secondary";
}

function PedidosPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["open_orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("open_orders")
        .select("*")
        .order("forecast_billing_requested", { ascending: true, nullsFirst: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const statuses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r: any) => r.status_tracking && set.add(r.status_tracking));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r: any) => {
      if (status !== "all" && r.status_tracking !== status) return false;
      if (!s) return true;
      return [r.client_name, r.client_code, r.product_name, r.order_number, r.erc, r.line, r.financial_block_reason]
        .some((v) => (v ?? "").toString().toLowerCase().includes(s));
    });
  }, [rows, q, status]);

  const k = useMemo(() => {
    const total = filtered.reduce((a: number, r: any) => a + Number(r.order_value ?? 0), 0);
    const vol = filtered.reduce((a: number, r: any) => a + Number(r.order_volume ?? 0), 0);
    const blocked = filtered.filter((r: any) => (r.status_tracking ?? "").toLowerCase().includes("bloque"));
    const blockedVal = blocked.reduce((a: number, r: any) => a + Number(r.order_value ?? 0), 0);
    const orders = new Set(filtered.map((r: any) => r.order_number).filter(Boolean)).size;
    const clients = new Set(filtered.map((r: any) => r.client_code).filter(Boolean)).size;

    const byStatus: Record<string, { qty: number; val: number }> = {};
    filtered.forEach((r: any) => {
      const key = r.status_tracking || "—";
      byStatus[key] ??= { qty: 0, val: 0 };
      byStatus[key].qty += 1;
      byStatus[key].val += Number(r.order_value ?? 0);
    });

    const byErc: Record<string, number> = {};
    filtered.forEach((r: any) => {
      const key = r.erc || "—";
      byErc[key] = (byErc[key] ?? 0) + Number(r.order_value ?? 0);
    });

    return { total, vol, blockedVal, blockedCount: blocked.length, orders, clients, byStatus, byErc };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos em Aberto</h1>
        <p className="text-sm text-muted-foreground">{rows.length} itens na carteira</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Valor em carteira" value={formatCurrency(k.total)} />
        <KpiCard label="Volume (kg/sc)" value={k.vol.toLocaleString("pt-BR")} />
        <KpiCard label="Pedidos" value={k.orders.toString()} sub={`${k.clients} clientes`} />
        <KpiCard label="Bloqueados" value={formatCurrency(k.blockedVal)} sub={`${k.blockedCount} itens`} />
        <KpiCard label="Linhas" value={filtered.length.toString()} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-3">Por Status</div>
          <div className="space-y-2">
            {Object.entries(k.byStatus).sort((a, b) => b[1].val - a[1].val).map(([s, v]) => (
              <div key={s} className="flex justify-between items-center text-xs">
                <Badge variant={statusVariant(s)} className="text-[10px]">{s}</Badge>
                <span className="font-mono">{formatCurrency(v.val)} <span className="text-muted-foreground">({v.qty})</span></span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-3">Top Representantes (ERC)</div>
          <div className="space-y-2">
            {Object.entries(k.byErc).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s, v]) => (
              <div key={s} className="flex justify-between text-xs">
                <span className="truncate pr-2">{s}</span>
                <span className="font-mono">{formatCurrency(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar pedido, cliente, produto, ERC..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto max-h-[700px]">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-left p-2 font-medium">Pedido</th>
                <th className="text-left p-2 font-medium">Cliente</th>
                <th className="text-left p-2 font-medium">Produto</th>
                <th className="text-left p-2 font-medium">Linha</th>
                <th className="text-right p-2 font-medium">Valor</th>
                <th className="text-right p-2 font-medium">Volume</th>
                <th className="text-left p-2 font-medium">Prev. Fat.</th>
                <th className="text-left p-2 font-medium">Bloqueio</th>
                <th className="text-left p-2 font-medium">ERC</th>
                <th className="text-left p-2 font-medium">Filial</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && !filtered.length && <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Nenhum pedido encontrado</td></tr>}
              {filtered.slice(0, 500).map((r: any) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-2"><Badge variant={statusVariant(r.status_tracking)} className="text-[10px]">{r.status_tracking || "-"}</Badge></td>
                  <td className="p-2 font-mono">{r.order_number}</td>
                  <td className="p-2">{r.client_name}</td>
                  <td className="p-2">{r.product_name}</td>
                  <td className="p-2">{r.line || "-"}</td>
                  <td className="p-2 text-right">{formatCurrency(r.order_value)}</td>
                  <td className="p-2 text-right">{Number(r.order_volume ?? 0).toLocaleString("pt-BR")}</td>
                  <td className="p-2 whitespace-nowrap">{r.forecast_billing_requested ? new Date(r.forecast_billing_requested).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="p-2 text-[11px]">{r.financial_block_reason || r.prescription_block_reason || "-"}</td>
                  <td className="p-2 text-[11px]">{r.erc}</td>
                  <td className="p-2 text-[11px]">{r.branch_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 500 && <p className="p-2 text-center text-xs text-muted-foreground">Mostrando 500 de {filtered.length}. Refine a busca.</p>}
        </div>
      </Card>
    </div>
  );
}

