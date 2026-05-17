import { useQuery } from "@tanstack/react-query";
import { clientsService } from "@/services/crm.service";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/crm/KpiCard";
import { formatCurrency } from "@/utils/formatters";

export function ClientSalesTab({ clientId }: { clientId: string }) {
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["client_sales", clientId],
    queryFn: () => clientsService.getSales(clientId),
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>;
  if (!sales.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda registrada para este cliente.</p>;

  const totalRev = sales.reduce((a: number, s: any) => a + Number(s.revenue ?? 0), 0);
  const totalMB = sales.reduce((a: number, s: any) => a + Number(s.mb_cb_total ?? 0), 0);
  const totalML = sales.reduce((a: number, s: any) => a + Number(s.ml_cb_total ?? 0), 0);
  const totalQty = sales.reduce((a: number, s: any) => a + Number(s.qty_bags ?? 0), 0);

  const byLine: Record<string, { rev: number; qty: number }> = {};
  sales.forEach((s: any) => {
    const k = s.line || "—";
    byLine[k] ??= { rev: 0, qty: 0 };
    byLine[k].rev += Number(s.revenue ?? 0);
    byLine[k].qty += Number(s.qty_bags ?? 0);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Faturamento" value={formatCurrency(totalRev)} />
        <KpiCard 
          label="MB CB" 
          value={formatCurrency(totalMB)} 
          sub={totalRev ? `${((totalMB/totalRev)*100).toFixed(1)}%` : ""} 
        />
        <KpiCard 
          label="ML CB" 
          value={formatCurrency(totalML)} 
          sub={totalRev ? `${((totalML/totalRev)*100).toFixed(1)}%` : ""} 
        />
        <KpiCard 
          label="Volume (sacos)" 
          value={totalQty.toLocaleString("pt-BR")} 
          sub={`${sales.length} NFs`} 
        />
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Por linha</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(byLine).map(([line, v]) => (
            <Badge key={line} variant="outline" className="text-xs">
              {line}: {formatCurrency(v.rev)} ({v.qty.toLocaleString("pt-BR")} sc)
            </Badge>
          ))}
        </div>
      </div>

      <div className="max-h-96 overflow-auto border rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground sticky top-0">
            <tr>
              <th className="text-left p-2 font-medium">Data</th>
              <th className="text-left p-2 font-medium">NF</th>
              <th className="text-left p-2 font-medium">Produto</th>
              <th className="text-right p-2 font-medium">Qtd (sc)</th>
              <th className="text-right p-2 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s: any, i: number) => (
              <tr key={i} className="border-t hover:bg-muted/20">
                <td className="p-2">{s.invoice_date ? new Date(s.invoice_date).toLocaleDateString("pt-BR") : "-"}</td>
                <td className="p-2">{s.invoice_number}</td>
                <td className="p-2 truncate max-w-[120px]" title={s.product_name}>{s.product_name}</td>
                <td className="p-2 text-right">{Number(s.qty_bags ?? 0).toLocaleString("pt-BR")}</td>
                <td className="p-2 text-right">{formatCurrency(s.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
