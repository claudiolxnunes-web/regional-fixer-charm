import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Activity, AlertCircle, TrendingDown, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Props {
  clientId?: string;
}

export function CustomerHealthScore({ clientId }: Props) {
  const { data: client, isLoading } = useQuery({
    queryKey: ["client-health", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("clients")
        .select("id, name, health_score, health_status, last_purchase_date")
        .eq("id", clientId)
        .single();
      return data;
    },
    enabled: !!clientId,
  });

  if (isLoading || !client) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Saudável": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "Atenção": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "Crítico": return "text-destructive bg-destructive/10 border-destructive/20";
      default: return "";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Heart className="size-4 text-primary" /> Saúde do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{client.health_score ?? 0}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <Badge className={getStatusColor(client.health_status ?? "")}>
              {client.health_status ?? "Indefinido"}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getScoreColor(client.health_score ?? 0)}`}
                style={{ width: `${client.health_score ?? 0}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              Última compra: {client.last_purchase_date ? new Date(client.last_purchase_date).toLocaleDateString("pt-BR") : "Nunca"}
            </div>
            {client.health_score !== null && client.health_score < 60 && (
              <div className="flex items-start gap-2 p-2 rounded bg-destructive/5 text-[10px] text-destructive border border-destructive/10">
                <AlertCircle className="size-3 mt-0.5 shrink-0" />
                <span>Risco de Churn: Cliente sem compras recentes. Recomendado contato imediato.</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
