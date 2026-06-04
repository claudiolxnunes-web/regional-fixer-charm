import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, Beef, AlertCircle, Info, ClipboardList, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { SupplementationPlanDialog } from "./SupplementationPlanDialog";
import { PlanExecutionDialog } from "./PlanExecutionDialog";

interface ClientNutritionTabProps {
  clientId: string;
}

export function ClientNutritionTab({ clientId }: ClientNutritionTabProps) {
  const qc = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [selectedRebanhoId, setSelectedRebanhoId] = useState<string>("none");
  const [notes, setNotes] = useState("");

  const { data: rebanhos = [], isLoading: loadingRebanhos } = useQuery({
    queryKey: ["rebanhos", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("rebanhos").select("*").eq("client_id", clientId).order("name");
      return data ?? [];
    },
  });

  const { data: activeLinks = [], isLoading: loadingLinks } = useQuery({
    queryKey: ["client-nutrition-cycles", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("crop_cycle_client_links")
        .select(`
          *,
          cycle:crop_cycles(*),
          rebanho:rebanhos(name),
          plans:supplementation_plans(*)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["nutrition-alerts", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("nutrition_alerts")
        .select("*")
        .eq("client_id", clientId)
        .order("alert_date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["crop-cycles", "Animal"],
    queryFn: async () => {
      const { data } = await supabase.from("crop_cycles").select("*").eq("type", "Animal").order("name");
      return data ?? [];
    },
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCycleId) throw new Error("Selecione um ciclo");
      const { error } = await supabase.from("crop_cycle_client_links").insert({
        cycle_id: selectedCycleId,
        client_id: clientId,
        rebanho_id: selectedRebanhoId === "none" ? null : selectedRebanhoId,
        notes: notes || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ciclo nutricional vinculado");
      setIsAddOpen(false);
      setSelectedCycleId("");
      setSelectedRebanhoId("none");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["client-nutrition-cycles", clientId] });
      qc.invalidateQueries({ queryKey: ["nutrition-alerts", clientId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unlinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crop_cycle_client_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vínculo removido");
      qc.invalidateQueries({ queryKey: ["client-nutrition-cycles", clientId] });
      qc.invalidateQueries({ queryKey: ["nutrition-alerts", clientId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Beef className="size-4 text-orange-500" /> Ciclos e Nutrição do Rebanho
        </h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4 mr-1" /> Vincular Ciclo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Ciclo Nutricional</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Ciclo (Safra/Entresafra)</Label>
                <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o ciclo..." /></SelectTrigger>
                  <SelectContent>
                    {cycles.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} - {c.culture}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rebanho (opcional)</Label>
                <Select value={selectedRebanhoId} onValueChange={setSelectedRebanhoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o rebanho..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral / Todos</SelectItem>
                    {rebanhos.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name} ({r.category})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas específicas para este cliente..." />
              </div>
              <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-700 flex gap-2">
                <Info className="size-4 shrink-0" />
                <span>Ao vincular, alertas automáticos serão gerados baseados nas datas do ciclo.</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
              <Button onClick={() => linkMutation.mutate()} disabled={linkMutation.isPending}>Vincular</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="py-3"><CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ciclos e Planos Ativos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {activeLinks.map((link: any) => (
              <div key={link.id} className="p-3 rounded-lg border bg-muted/30 relative group">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-sm">{link.cycle.name}</div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => unlinkMutation.mutate(link.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="text-[10px] flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] h-4 py-0">{link.cycle.culture}</Badge>
                    {link.rebanho && <Badge variant="secondary" className="text-[9px] h-4 py-0">{link.rebanho.name}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <SupplementationPlanDialog 
                      linkId={link.id} 
                      cycleName={link.cycle.name}
                      rebanhoName={link.rebanho?.name}
                      trigger={
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-primary hover:text-primary-foreground hover:bg-primary">
                          <ClipboardList className="size-3 mr-1" /> Plano
                        </Button>
                      }
                    />
                    {link.plans && link.plans.length > 0 && (
                      <PlanExecutionDialog
                        planId={link.plans[0].id}
                        cycleName={link.cycle.name}
                        rebanhoName={link.rebanho?.name}
                        trigger={
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-green-600 hover:text-white hover:bg-green-600">
                            <ClipboardCheck className="size-3 mr-1" /> Execução
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Período: {new Date(link.cycle.start_date).toLocaleDateString("pt-BR")} a {new Date(link.cycle.end_date).toLocaleDateString("pt-BR")}
                </div>
              </div>
            ))}
            {activeLinks.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground italic">
                Nenhum ciclo vinculado a este cliente.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Próximos Alertas</CardTitle>
            <AlertCircle className="size-4 text-orange-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.filter((a: any) => new Date(a.alert_date) >= new Date()).slice(0, 5).map((alert: any) => (
              <div key={alert.id} className="flex gap-3 p-2 rounded border border-transparent hover:bg-muted/50 transition-colors">
                <div className="text-center min-w-[40px] pt-1">
                  <div className="text-[10px] font-bold text-primary">{new Date(alert.alert_date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{alert.title}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2">{alert.description}</div>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground italic">
                Sem alertas programados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gerenciar Rebanhos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left pb-2">Nome</th>
                  <th className="text-left pb-2">Tipo/Categoria</th>
                  <th className="text-right pb-2">Qtd</th>
                  <th className="text-right pb-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rebanhos.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="py-2">{r.type} - {r.category}</td>
                    <td className="py-2 text-right">{r.quantity}</td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" size="sm" className="size-7 p-0" onClick={async () => {
                        if(confirm("Excluir este rebanho?")) {
                          await supabase.from("rebanhos").delete().eq("id", r.id);
                          qc.invalidateQueries({ queryKey: ["rebanhos", clientId] });
                        }
                      }}><Trash2 className="size-3.5 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
                {rebanhos.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-muted-foreground italic">Nenhum rebanho cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => {
            const name = prompt("Nome do rebanho:");
            if (name) {
              supabase.from("rebanhos").insert({
                client_id: clientId,
                name,
                type: "Bovinos",
                category: "Corte",
                quantity: 0
              }).then(() => qc.invalidateQueries({ queryKey: ["rebanhos", clientId] }));
            }
          }}><Plus className="size-3 mr-1" /> Adicionar Rebanho</Button>
        </CardContent>
      </Card>
    </div>
  );
}
