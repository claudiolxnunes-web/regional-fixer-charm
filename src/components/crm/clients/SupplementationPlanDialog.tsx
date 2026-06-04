import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Save, Sparkles, ClipboardList, Package } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface PlanGoal {
  title: string;
  target: string;
}

interface PlanInput {
  product: string;
  dosage: string;
  period: string;
}

interface SupplementationPlanDialogProps {
  linkId: string;
  cycleName: string;
  rebanhoName?: string;
  trigger?: React.ReactNode;
}

export function SupplementationPlanDialog({ linkId, cycleName, rebanhoName, trigger }: SupplementationPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [inputs, setInputs] = useState<PlanInput[]>([]);
  const [status, setStatus] = useState("draft");

  const { data: plan, isLoading: loadingPlan } = useQuery({
    queryKey: ["supplementation-plan", linkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplementation_plans")
        .select(`
          *,
          link:crop_cycle_client_links(
            cycle:crop_cycles(*)
          )
        `)
        .eq("link_id", linkId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const { data: linkInfo } = useQuery({
    queryKey: ["cycle-link-info", linkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crop_cycle_client_links")
        .select(`
          *,
          cycle:crop_cycles(*)
        `)
        .eq("id", linkId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !plan
  });

  useEffect(() => {
    if (plan) {
      setGoals((plan.goals as unknown as PlanGoal[]) || []);
      setInputs((plan.inputs as unknown as PlanInput[]) || []);
      setStatus(plan.status || "draft");
    } else {
      setGoals([]);
      setInputs([]);
      setStatus("draft");
    }
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        link_id: linkId,
        goals: goals as any,
        inputs: inputs as any,
        status
      };

      if (plan?.id) {
        const { error } = await supabase
          .from("supplementation_plans")
          .update(payload)
          .eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("supplementation_plans")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Plano de suplementação salvo com sucesso");
      qc.invalidateQueries({ queryKey: ["supplementation-plan", linkId] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message)
  });

  const addGoal = () => setGoals([...goals, { title: "", target: "" }]);
  const removeGoal = (index: number) => setGoals(goals.filter((_, i) => i !== index));
  const updateGoal = (index: number, field: keyof PlanGoal, value: string) => {
    const newGoals = [...goals];
    newGoals[index][field] = value;
    setGoals(newGoals);
  };

  const addInput = () => setInputs([...inputs, { product: "", dosage: "", period: "" }]);
  const removeInput = (index: number) => setInputs(inputs.filter((_, i) => i !== index));
  const updateInput = (index: number, field: keyof PlanInput, value: string) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };

  const generateAIPrescription = () => {
    toast.info("A IA está analisando a sazonalidade e as recomendações do ciclo...");
    
    const cycle = (plan as any)?.link?.cycle || (linkInfo as any)?.cycle;
    const isSafra = cycle?.name?.toLowerCase().includes("safra");
    const recProducts = (cycle?.recommended_products as string[]) || [];

    if (isSafra) {
      setGoals([
        { title: "Ganho de Peso Médio", target: "1.0 - 1.2 kg/dia" },
        { title: "Aproveitamento de Pasto", target: "Máximo" },
        { title: "Eficiência Alimentar", target: "Alta" }
      ]);
      
      const suggestedInputs = recProducts.length > 0 
        ? recProducts.map(p => ({ product: p, dosage: "150g/cab", period: "Diário" }))
        : [
            { product: "Sal Mineral Aditivado", dosage: "100g/cab", period: "Diário" },
            { product: "Proteinada Águas", dosage: "200g/cab", period: "Diário" }
          ];
      setInputs(suggestedInputs);
    } else {
      setGoals([
        { title: "Manutenção de Peso", target: "Evitar perda" },
        { title: "Escore Corporal", target: "3.5 - 4.0" },
        { title: "Transição para Confinamento", target: "Início" }
      ]);

      const suggestedInputs = recProducts.length > 0 
        ? recProducts.map(p => ({ product: p, dosage: "400g/cab", period: "Diário" }))
        : [
            { product: "Sal Proteinado Secas", dosage: "400g/cab", period: "Diário" },
            { product: "Fosbovi Proteico Energético", dosage: "500g/cab", period: "Diário" }
          ];
      setInputs(suggestedInputs);
    }
    toast.success("Sugestões aplicadas com base na sazonalidade!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline"><ClipboardList className="size-4 mr-1" /> Plano</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-orange-500" /> 
              Plano de Suplementação - {cycleName}
            </DialogTitle>
            <Badge variant={status === "active" ? "default" : "secondary"}>
              {status === "active" ? "Ativo" : "Rascunho"}
            </Badge>
          </div>
          {rebanhoName && <p className="text-sm text-muted-foreground mt-1">Rebanho: {rebanhoName}</p>}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" /> Metas de Manejo
              </h4>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={addGoal}>
                <Plus className="size-3 mr-1" /> Meta
              </Button>
            </div>
            
            <div className="space-y-3">
              {goals.map((goal, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input 
                    placeholder="Título da meta (ex: Ganho de Peso)" 
                    value={goal.title} 
                    onChange={(e) => updateGoal(i, "title", e.target.value)}
                    className="flex-1"
                  />
                  <Input 
                    placeholder="Alvo (ex: 1.2kg/dia)" 
                    value={goal.target} 
                    onChange={(e) => updateGoal(i, "target", e.target.value)}
                    className="w-1/3"
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeGoal(i)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {goals.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/30 rounded-lg">
                  Nenhuma meta definida.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Package className="size-4 text-primary" /> Sugestões de Insumos
              </h4>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={addInput}>
                <Plus className="size-3 mr-1" /> Insumo
              </Button>
            </div>

            <div className="space-y-3">
              {inputs.map((input, i) => (
                <div key={i} className="grid grid-cols-7 gap-2 items-start">
                  <div className="col-span-3">
                    <Input 
                      placeholder="Produto" 
                      value={input.product} 
                      onChange={(e) => updateInput(i, "product", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input 
                      placeholder="Dosagem" 
                      value={input.dosage} 
                      onChange={(e) => updateInput(i, "dosage", e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Input 
                      placeholder="Frequência" 
                      value={input.period} 
                      onChange={(e) => updateInput(i, "period", e.target.value)}
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeInput(i)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {inputs.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/30 rounded-lg">
                  Nenhum insumo sugerido.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between items-center sm:justify-between border-t pt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100"
            onClick={generateAIPrescription}
          >
            <Sparkles className="size-4 mr-2" /> Sugerir Metas e Insumos (IA)
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => {
              setStatus("active");
              saveMutation.mutate();
            }} disabled={saveMutation.isPending}>
              <Save className="size-4 mr-2" /> Salvar Plano
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
