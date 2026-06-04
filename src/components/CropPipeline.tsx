import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, ChevronRight, Package, AlertCircle, Beef, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export function CropPipeline() {
  const [activeType, setActiveType] = useState<string>("Vegetal");

  const { data: cycles, isLoading } = useQuery({
    queryKey: ["crop-cycles", activeType],
    queryFn: async () => {
      const { data } = await supabase
        .from("crop_cycles")
        .select("*")
        .eq("type", activeType)
        .order("start_date", { ascending: true });
      return data ?? [];
    },
  });

  const phases = activeType === "Vegetal" 
    ? ["Plantio", "Desenvolvimento", "Colheita"]
    : ["Início", "Desenvolvimento", "Pico/Final"];

  if (isLoading) return <div className="h-48 animate-pulse bg-muted rounded-lg" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {activeType === "Vegetal" ? (
            <Leaf className="size-5 text-emerald-500" />
          ) : (
            <Beef className="size-5 text-orange-500" />
          )}
          Pipeline de Ciclos Agro
        </CardTitle>
        <Tabs value={activeType} onValueChange={setActiveType} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="Vegetal" className="text-xs">Vegetal</TabsTrigger>
            <TabsTrigger value="Animal" className="text-xs">Animal</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {phases.map((phase) => (
            <div key={phase} className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{phase}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {cycles?.filter(c => c.phase === phase || (activeType === "Animal" && phase === "Início" && c.phase === "Plantio") || (activeType === "Animal" && phase === "Pico/Final" && c.phase === "Colheita")).length ?? 0}
                </Badge>
              </div>
              <div className="space-y-2">
                {cycles?.filter(c => 
                  c.phase === phase || 
                  (activeType === "Animal" && phase === "Início" && c.phase === "Plantio") || 
                  (activeType === "Animal" && phase === "Pico/Final" && c.phase === "Colheita")
                ).map((cycle) => (
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
                {(!cycles || cycles.filter(c => 
                  c.phase === phase || 
                  (activeType === "Animal" && phase === "Início" && c.phase === "Plantio") || 
                  (activeType === "Animal" && phase === "Pico/Final" && c.phase === "Colheita")
                ).length === 0) && (
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
