import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, TrendingUp, DollarSign, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { formatCurrencyCompact } from "@/utils/formatters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/produtos")({ component: ProdutosPage });

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

function ProdutosPage() {
  const [q, setQ] = useState("");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["products-analytics"],
    queryFn: async () => {
      const [pRes, sRes] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("sales").select("product_code, product_name, revenue, volume_sales, qty_bags")
      ]);

      if (pRes.error) throw pRes.error;
      if (sRes.error) throw sRes.error;

      const sales = sRes.data || [];
      const productMap: Record<string, any> = {};

      sales.forEach(sale => {
        const code = sale.product_code || "UNKNOWN";
        if (!productMap[code]) {
          productMap[code] = {
            code,
            name: sale.product_name || "Sem Nome",
            totalRevenue: 0,
            totalVolume: 0,
            saleCount: 0
          };
        }
        productMap[code].totalRevenue += Number(sale.revenue || 0);
        productMap[code].totalVolume += Number(sale.volume_sales || sale.qty_bags || 0);
        productMap[code].saleCount += 1;
      });

      const productList = Object.values(productMap)
        .map(p => ({
          ...p,
          avgPrice: p.totalVolume > 0 ? p.totalRevenue / p.totalVolume : 0
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Curva ABC
      const totalRevenue = productList.reduce((sum, p) => sum + p.totalRevenue, 0);
      let cumulativeRevenue = 0;
      const abcData = productList.map(p => {
        cumulativeRevenue += p.totalRevenue;
        const percentage = (cumulativeRevenue / totalRevenue) * 100;
        let classification = "C";
        if (percentage <= 70) classification = "A";
        else if (percentage <= 90) classification = "B";
        
        return { ...p, classification, percentage };
      });

      const abcSummary = [
        { name: "Classe A", value: abcData.filter(p => p.classification === "A").length, revenue: abcData.filter(p => p.classification === "A").reduce((s, x) => s + x.totalRevenue, 0) },
        { name: "Classe B", value: abcData.filter(p => p.classification === "B").length, revenue: abcData.filter(p => p.classification === "B").reduce((s, x) => s + x.totalRevenue, 0) },
        { name: "Classe C", value: abcData.filter(p => p.classification === "C").length, revenue: abcData.filter(p => p.classification === "C").reduce((s, x) => s + x.totalRevenue, 0) },
      ];

      return {
        products: abcData,
        abcSummary,
        totalRevenue,
        totalProducts: pRes.data.length
      };
    }
  });

  const filtered = useMemo(() => {
    if (!stats?.products) return [];
    return stats.products.filter(p => 
      p.name.toLowerCase().includes(q.toLowerCase()) || 
      p.code.toLowerCase().includes(q.toLowerCase())
    );
  }, [stats?.products, q]);

  if (isLoading) return <div className="p-8 text-center animate-pulse">Carregando análise de produtos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Análise de Produtos</h1>
          <p className="text-sm text-muted-foreground">Performance e Classificação ABC</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total em Vendas</p>
                <h3 className="text-2xl font-bold mt-1">R$ {formatCurrencyCompact(stats?.totalRevenue)}</h3>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg"><DollarSign className="size-5 text-emerald-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Mix de Produtos</p>
                <h3 className="text-2xl font-bold mt-1">{stats?.totalProducts} itens</h3>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg"><Package className="size-5 text-blue-500" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Produtos Curva A</p>
                <h3 className="text-2xl font-bold mt-1">{stats?.abcSummary[0].value} itens</h3>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg"><TrendingUp className="size-5 text-amber-500" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="size-4" /> Distribuição de Receita (Classe)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.abcSummary}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis hide />
                <Tooltip 
                  formatter={(value) => [`R$ ${Number(value).toLocaleString()}`, 'Receita']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {stats?.abcSummary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><PieChartIcon className="size-4" /> Composição do Mix</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.abcSummary} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {stats?.abcSummary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Detalhamento por Produto</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Buscar produto ou código..." className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Código</th>
                  <th className="p-3 text-left">Produto</th>
                  <th className="p-3 text-right">Volume Total</th>
                  <th className="p-3 text-right">Preço Médio</th>
                  <th className="p-3 text-right">Faturamento</th>
                  <th className="p-3 text-center">Curva</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.code} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-mono text-xs">{p.code}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-right">{Number(p.totalVolume).toLocaleString()}</td>
                    <td className="p-3 text-right">R$ {Number(p.avgPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-semibold">R$ {Number(p.totalRevenue).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={
                        p.classification === 'A' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                        p.classification === 'B' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                        "bg-slate-500/10 text-slate-600 border-slate-500/20"
                      }>
                        {p.classification}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
