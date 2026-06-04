import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, ChevronRight, Package, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CropPipeline() {
  const { data: cycles, isLoading } = useQuery({
    queryKey: ["crop-cycles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("crop_cycles")
        .select("*")
        .order("start_date", { ascending: true });
      return data ?? [];
    },
  });

  const phases = ["Plantio", "Desenvolvimento", "Colheita"];

  if (isLoading) return <div className="h-48 animate-pulse bg-muted rounded-lg" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sprout className="size-5 text-primary" /> Pipeline de Safra
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {phases.map((phase) => (
            <div key={phase} className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{phase}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {cycles?.filter(c => c.phase === phase).length ?? 0} ciclos
                </Badge>
              </div>
              <div className="space-y-2">
                {cycles?.filter(c => c.phase === phase).map((cycle) => (
                  <div key={cycle.id} className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm">{cycle.culture}</div>
                      <Badge variant="outline" className="text-[9px]">{cycle.name}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-2">
                      {new Date(cycle.start_date).toLocaleDateString("pt-BR")} 
                      <ChevronRight className="size-2" />
                      {new Date(cycle.end_date).toLocaleDateString("pt-BR")}
                    </div>
                    {cycle.recommended_products && (cycle.recommended_products as any[]).length > 0 && (
                      <div className="pt-2 border-t mt-2">
                        <div className="text-[9px] font-bold text-primary flex items-center gap-1 mb-1">
                          <Package className="size-3" /> Sugestão de Insumos:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(cycle.recommended_products as string[]).map((p, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[8px] h-4 py-0">{p}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(!cycles || cycles.filter(c => c.phase === phase).length === 0) && (
                  <div className="text-[10px] text-muted-foreground italic text-center py-4">
                    Nenhum ciclo ativo
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
