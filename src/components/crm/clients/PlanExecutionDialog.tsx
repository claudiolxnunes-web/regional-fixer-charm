import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, History, Save, TrendingUp, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { format } from "date-fns";

interface PlanExecutionDialogProps {
  planId: string;
  cycleName: string;
  rebanhoName?: string;
  trigger?: React.ReactNode;
}

export function PlanExecutionDialog({ planId, cycleName, rebanhoName, trigger }: PlanExecutionDialogProps) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  // State for new execution
  const [executionDate, setExecutionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [actualMetrics, setActualMetrics] = useState<any[]>([]);
  const [consumption, setConsumption] = useState<any[]>([]);
  const [applicationNotes, setApplicationNotes] = useState("");
  const [observations, setObservations] = useState("");

  const { data: plan } = useQuery({
    queryKey: ["supplementation-plan-details", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplementation_plans")
        .select("*")
        .eq("id", planId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const { data: executions = [] } = useQuery({
    queryKey: ["plan-executions", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_executions")
        .select("*")
        .eq("plan_id", planId)
        .order("execution_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open
  });

  useEffect(() => {
    if (plan && activeTab === "new") {
      const goals = (plan.goals as any[]) || [];
      const inputs = (plan.inputs as any[]) || [];
      
      setActualMetrics(goals.map(g => ({ title: g.title, target: g.target, value: "" })));
      setConsumption(inputs.map(i => ({ product: i.product, target: i.dosage, amount: "" })));
    }
  }, [plan, activeTab]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("plan_executions").insert({
        plan_id: planId,
        execution_date: executionDate,
        actual_metrics: actualMetrics,
        consumption: consumption,
        application_notes: applicationNotes,
        observations: observations
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro de execução salvo com sucesso");
      qc.invalidateQueries({ queryKey: ["plan-executions", planId] });
      setActiveTab("history");
      setApplicationNotes("");
      setObservations("");
    },
    onError: (e: any) => toast.error(e.message)
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline"><ClipboardCheck className="size-4 mr-1" /> Execução</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-green-600" /> 
              Execução do Plano - {cycleName}
            </DialogTitle>
            <div className="flex bg-muted p-1 rounded-md">
              <Button 
                variant={activeTab === "new" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setActiveTab("new")}
              >
                Novo Registro
              </Button>
              <Button 
                variant={activeTab === "history" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setActiveTab("history")}
              >
                Histórico
              </Button>
            </div>
          </div>
          {rebanhoName && <p className="text-sm text-muted-foreground mt-1">Rebanho: {rebanhoName}</p>}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {activeTab === "new" ? (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data da Execução</Label>
                  <Input type="date" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <TrendingUp className="size-4" /> Comparativo de Metas
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {actualMetrics.map((metric, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-muted">
                      <div className="flex-1">
                        <div className="text-xs font-medium">{metric.title}</div>
                        <div className="text-[10px] text-muted-foreground">Meta: {metric.target}</div>
                      </div>
                      <div className="w-1/3">
                        <Input 
                          placeholder="Valor Realizado" 
                          value={metric.value} 
                          onChange={(e) => {
                            const newMetrics = [...actualMetrics];
                            newMetrics[i].value = e.target.value;
                            setActualMetrics(newMetrics);
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                  <Info className="size-4" /> Consumo de Insumos
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {consumption.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-muted">
                      <div className="flex-1">
                        <div className="text-xs font-medium">{item.product}</div>
                        <div className="text-[10px] text-muted-foreground">Dosagem Sugerida: {item.target}</div>
                      </div>
                      <div className="w-1/3">
                        <Input 
                          placeholder="Consumo Real" 
                          value={item.amount} 
                          onChange={(e) => {
                            const newConsumption = [...consumption];
                            newConsumption[i].amount = e.target.value;
                            setConsumption(newConsumption);
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Notas de Aplicação</Label>
                  <Textarea 
                    placeholder="Como foi feita a aplicação..." 
                    value={applicationNotes} 
                    onChange={(e) => setApplicationNotes(e.target.value)}
                    className="h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações Gerais</Label>
                  <Textarea 
                    placeholder="Intercorrências, comportamento do rebanho..." 
                    value={observations} 
                    onChange={(e) => setObservations(e.target.value)}
                    className="h-20"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {executions.map((exec: any) => (
                <Card key={exec.id}>
                  <CardHeader className="py-3 bg-muted/20">
                    <CardTitle className="text-sm flex justify-between items-center">
                      <span>{format(new Date(exec.execution_date), "dd/MM/yyyy")}</span>
                      <History className="size-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-3 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Desempenho vs Metas</h5>
                        <div className="space-y-1">
                          {exec.actual_metrics.map((m: any, idx: number) => (
                            <div key={idx} className="text-xs flex justify-between border-b border-dashed pb-1">
                              <span className="text-muted-foreground">{m.title}:</span>
                              <span className="font-medium">{m.value || "N/A"} <span className="text-[10px] text-muted-foreground">(Meta: {m.target})</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Consumo Real</h5>
                        <div className="space-y-1">
                          {exec.consumption.map((c: any, idx: number) => (
                            <div key={idx} className="text-xs flex justify-between border-b border-dashed pb-1">
                              <span className="text-muted-foreground">{c.product}:</span>
                              <span className="font-medium">{c.amount || "N/A"} <span className="text-[10px] text-muted-foreground">({c.target})</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {(exec.application_notes || exec.observations) && (
                      <div className="text-[10px] bg-blue-50 p-2 rounded text-blue-800">
                        {exec.application_notes && <p><strong>Aplicação:</strong> {exec.application_notes}</p>}
                        {exec.observations && <p className="mt-1"><strong>Observações:</strong> {exec.observations}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {executions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground italic">
                  <AlertCircle className="size-8 mx-auto mb-2 opacity-20" />
                  Nenhuma execução registrada para este plano.
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {activeTab === "new" && (
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="size-4 mr-2" /> Salvar Registro
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}