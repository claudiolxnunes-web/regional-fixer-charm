import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RepRanking() {
  const { data: ranking, isLoading } = useQuery({
    queryKey: ["rep-ranking"],
    queryFn: async () => {
      const { data: reps } = await supabase
        .from("representatives")
        .select("id, name, total_sales, total_clients")
        .eq("status", "active")
        .order("total_sales", { ascending: false })
        .limit(10);
      return reps ?? [];
    },
  });

  if (isLoading) return <div className="h-48 animate-pulse bg-muted rounded-lg" />;

  const getIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="size-5 text-yellow-500" />;
      case 1: return <Medal className="size-5 text-slate-400" />;
      case 2: return <Award className="size-5 text-amber-600" />;
      default: return <span className="text-xs font-bold text-muted-foreground w-5 text-center">{index + 1}º</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" /> Ranking de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ranking?.map((rep, i) => (
            <div key={rep.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                {getIcon(i)}
                <div>
                  <div className="font-medium text-sm">{rep.name}</div>
                  <div className="text-[10px] text-muted-foreground">{rep.total_clients ?? 0} clientes ativos</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm">R$ {Number(rep.total_sales ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
                <Badge variant="secondary" className="text-[9px] h-4">Top {i + 1}</Badge>
              </div>
            </div>
          ))}
          {(!ranking || ranking.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
