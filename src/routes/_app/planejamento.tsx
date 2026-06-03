import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Compass, Plus, CheckCircle2, Trash2, Target as TargetIcon } from "lucide-react";

export const Route = createFileRoute("/_app/planejamento")({ component: PlanejamentoPage });

const STATUS_LABEL: Record<string, string> = {
  planned: "Planejado", in_progress: "Em andamento", done: "Concluído", overdue: "Atrasado",
};

function PlanejamentoPage() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [planOpen, setPlanOpen] = useState(false);
  const [objOpen, setObjOpen] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["strategic-plans"],
    queryFn: async () => (await supabase.from("strategic_plans").select("*").order("start_date", { ascending: false })).data ?? [],
  });
  const { data: objectives } = useQuery({
    queryKey: ["strategic-objectives"],
    queryFn: async () => (await supabase.from("strategic_objectives").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: actions } = useQuery({
    queryKey: ["strategic-actions"],
    queryFn: async () => (await supabase.from("strategic_actions").select("*").order("created_at")).data ?? [],
  });
  const { data: reps } = useQuery({
    queryKey: ["reps-min"],
    queryFn: async () => (await supabase.from("representatives").select("id, name").order("name").limit(2000)).data ?? [],
  });

  const currentPlan = useMemo(
    () => (plans ?? []).find((p) => p.id === selectedPlan) ?? plans?.[0],
    [plans, selectedPlan]
  );
  const planObjectives = (objectives ?? []).filter((o) => o.plan_id === currentPlan?.id);

  const overall = useMemo(() => {
    if (!planObjectives.length) return 0;
    const pcts = planObjectives.map((o) => {
      if (!o.target_value || Number(o.target_value) === 0) return o.status === "done" ? 100 : 0;
      return Math.min(100, (Number(o.current_value) / Number(o.target_value)) * 100);
    });
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }, [planObjectives]);

  if (!isStaff) {
    return (
      <Card><CardContent className="py-16 text-center text-muted-foreground">
        Esta área é exclusiva para gestores.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Compass className="size-6 text-primary" /> Planejamento Estratégico (SMART)
          </h1>
          <p className="text-sm text-muted-foreground">Defina objetivos Específicos, Mensuráveis, Atingíveis, Relevantes e com prazo.</p>
        </div>
        <NewPlanDialog open={planOpen} onOpenChange={setPlanOpen} onCreated={(id) => { setSelectedPlan(id); qc.invalidateQueries({ queryKey: ["strategic-plans"] }); }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Planos</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {(plans ?? []).map((p) => (
              <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                className={`w-full text-left p-2 rounded-md text-sm transition-colors ${currentPlan?.id === p.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                <div className="font-medium truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{p.period_type === "weekly" ? "Semanal" : "Mensal"}</Badge>
                  <span>{new Date(p.start_date).toLocaleDateString("pt-BR")} → {new Date(p.end_date).toLocaleDateString("pt-BR")}</span>
                </div>
              </button>
            ))}
            {!plans?.length && <p className="text-sm text-muted-foreground text-center py-4">Nenhum plano. Crie o primeiro.</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {currentPlan && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle>{currentPlan.title}</CardTitle>
                      {currentPlan.description && <p className="text-sm text-muted-foreground mt-1">{currentPlan.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setObjOpen(currentPlan.id)}>
                        <Plus className="size-4 mr-1" /> Objetivo
                      </Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!confirm("Excluir este plano e todos seus objetivos?")) return;
                        const { error } = await supabase.from("strategic_plans").delete().eq("id", currentPlan.id);
                        if (error) return toast.error(error.message);
                        toast.success("Plano excluído");
                        setSelectedPlan(null);
                        qc.invalidateQueries({ queryKey: ["strategic-plans"] });
                      }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Progresso geral</div>
                  <div className="flex items-center gap-3">
                    <Progress value={overall} className="flex-1" />
                    <span className="text-sm font-semibold w-12 text-right">{overall}%</span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {planObjectives.map((obj) => (
                  <ObjectiveCard
                    key={obj.id}
                    objective={obj}
                    actions={(actions ?? []).filter((a) => a.objective_id === obj.id)}
                    reps={reps ?? []}
                    onChange={() => {
                      qc.invalidateQueries({ queryKey: ["strategic-objectives"] });
                      qc.invalidateQueries({ queryKey: ["strategic-actions"] });
                    }}
                  />
                ))}
                {!planObjectives.length && (
                  <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Sem objetivos. Adicione o primeiro com o botão acima.
                  </CardContent></Card>
                )}
              </div>
            </>
          )}
          {!currentPlan && (
            <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">
              Selecione ou crie um plano para começar.
            </CardContent></Card>
          )}
        </div>
      </div>

      <NewObjectiveDialog
        planId={objOpen}
        onClose={() => setObjOpen(null)}
        reps={reps ?? []}
        onCreated={() => qc.invalidateQueries({ queryKey: ["strategic-objectives"] })}
      />
    </div>
  );
}

function NewPlanDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({ title: "", description: "", period_type: "monthly", start_date: "", end_date: "" });

  async function save() {
    if (!form.title || !form.start_date || !form.end_date) return toast.error("Preencha título e datas");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user?.id) return toast.error("Sessão expirada. Faça login novamente.");
    const { data, error } = await supabase.from("strategic_plans").insert({
      title: form.title, description: form.description || null,
      period_type: form.period_type, start_date: form.start_date, end_date: form.end_date,
      owner_id: u.user.id,
    }).select("id").single();
    if (error) return toast.error(error.message);
    if (!data?.id) return toast.error("Falha ao criar plano");
    toast.success("Plano criado");
    onOpenChange(false);
    setForm({ title: "", description: "", period_type: "monthly", start_date: "", end_date: "" });
    onCreated(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> Novo plano</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo plano estratégico</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Plano Mensal Maio 2026" /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Período</Label>
              <Select value={form.period_type} onValueChange={(v) => setForm({ ...form, period_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="monthly">Mensal</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Criar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewObjectiveDialog({ planId, onClose, reps, onCreated }: { planId: string | null; onClose: () => void; reps: any[]; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "", description: "", metric: "", target_value: "", due_date: "", assigned_rep_id: "",
    specific: "", measurable: "", achievable: "", relevant: "", time_bound: "",
  });

  async function save() {
    if (!planId || !form.title) return toast.error("Título obrigatório");
    const { error } = await supabase.from("strategic_objectives").insert({
      plan_id: planId, title: form.title, description: form.description || null,
      metric: form.metric || null,
      target_value: form.target_value ? Number(form.target_value) : 0,
      due_date: form.due_date || null,
      assigned_rep_id: form.assigned_rep_id || null,
      specific: form.specific || null, measurable: form.measurable || null,
      achievable: form.achievable || null, relevant: form.relevant || null,
      time_bound: form.time_bound || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Objetivo criado");
    onClose();
    setForm({ title: "", description: "", metric: "", target_value: "", due_date: "", assigned_rep_id: "",
      specific: "", measurable: "", achievable: "", relevant: "", time_bound: "" });
    onCreated();
  }

  return (
    <Dialog open={!!planId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo objetivo SMART</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Métrica</Label><Input value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} placeholder="Ex: Receita R$" /></div>
            <div><Label>Valor-alvo</Label><Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} /></div>
            <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div>
            <Label>Responsável (opcional)</Label>
            <Select value={form.assigned_rep_id} onValueChange={(v) => setForm({ ...form, assigned_rep_id: v })}>
              <SelectTrigger><SelectValue placeholder="Nenhum / Time" /></SelectTrigger>
              <SelectContent>{reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="border-t pt-3 space-y-3">
            <div className="text-sm font-semibold text-primary">Critérios SMART</div>
            <div><Label>S — Específico</Label><Textarea rows={2} value={form.specific} onChange={(e) => setForm({ ...form, specific: e.target.value })} placeholder="O que exatamente deve ser feito?" /></div>
            <div><Label>M — Mensurável</Label><Textarea rows={2} value={form.measurable} onChange={(e) => setForm({ ...form, measurable: e.target.value })} placeholder="Como vai ser medido?" /></div>
            <div><Label>A — Atingível</Label><Textarea rows={2} value={form.achievable} onChange={(e) => setForm({ ...form, achievable: e.target.value })} placeholder="É realista com os recursos disponíveis?" /></div>
            <div><Label>R — Relevante</Label><Textarea rows={2} value={form.relevant} onChange={(e) => setForm({ ...form, relevant: e.target.value })} placeholder="Por que é importante?" /></div>
            <div><Label>T — Temporal</Label><Textarea rows={2} value={form.time_bound} onChange={(e) => setForm({ ...form, time_bound: e.target.value })} placeholder="Qual o prazo?" /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Criar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ObjectiveCard({ objective, actions, reps, onChange }: { objective: any; actions: any[]; reps: any[]; onChange: () => void }) {
  const [newAction, setNewAction] = useState("");
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(objective.current_value ?? 0));

  const pct = objective.target_value && Number(objective.target_value) > 0
    ? Math.min(100, Math.round((Number(objective.current_value) / Number(objective.target_value)) * 100))
    : (objective.status === "done" ? 100 : 0);

  const repName = reps.find((r) => r.id === objective.assigned_rep_id)?.name;

  async function updateStatus(status: string) {
    await supabase.from("strategic_objectives").update({ status }).eq("id", objective.id);
    onChange();
  }
  async function saveValue() {
    await supabase.from("strategic_objectives").update({ current_value: Number(valueInput) || 0 }).eq("id", objective.id);
    setEditingValue(false);
    onChange();
  }
  async function addAction() {
    if (!newAction.trim()) return;
    await supabase.from("strategic_actions").insert({ objective_id: objective.id, title: newAction });
    setNewAction("");
    onChange();
  }
  async function toggleAction(a: any) {
    await supabase.from("strategic_actions").update({ done: !a.done, done_at: !a.done ? new Date().toISOString() : null }).eq("id", a.id);
    onChange();
  }
  async function delObjective() {
    if (!confirm("Excluir este objetivo?")) return;
    await supabase.from("strategic_objectives").delete().eq("id", objective.id);
    onChange();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <TargetIcon className="size-4 text-primary shrink-0" />
              {objective.title}
            </CardTitle>
            {objective.description && <p className="text-sm text-muted-foreground mt-1">{objective.description}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {repName && <Badge variant="outline">{repName}</Badge>}
              {objective.due_date && <Badge variant="outline">Prazo {new Date(objective.due_date).toLocaleDateString("pt-BR")}</Badge>}
              <Select value={objective.status} onValueChange={updateStatus}>
                <SelectTrigger className="h-7 w-auto text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="icon" variant="ghost" aria-label="Excluir objetivo" onClick={delObjective}><Trash2 className="size-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {objective.metric && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{objective.metric}</span>
              {editingValue ? (
                <div className="flex items-center gap-1">
                  <Input className="h-6 w-24 text-xs" type="number" value={valueInput} onChange={(e) => setValueInput(e.target.value)} />
                  <Button size="sm" className="h-6" onClick={saveValue}>OK</Button>
                </div>
              ) : (
                <button onClick={() => setEditingValue(true)} className="hover:text-primary">
                  {Number(objective.current_value).toLocaleString("pt-BR")} / {Number(objective.target_value).toLocaleString("pt-BR")}
                </button>
              )}
            </div>
            <Progress value={pct} />
          </div>
        )}

        {(objective.specific || objective.measurable || objective.achievable || objective.relevant || objective.time_bound) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border rounded-md p-3 bg-muted/30">
            {objective.specific && <div><b className="text-primary">S:</b> {objective.specific}</div>}
            {objective.measurable && <div><b className="text-primary">M:</b> {objective.measurable}</div>}
            {objective.achievable && <div><b className="text-primary">A:</b> {objective.achievable}</div>}
            {objective.relevant && <div><b className="text-primary">R:</b> {objective.relevant}</div>}
            {objective.time_bound && <div><b className="text-primary">T:</b> {objective.time_bound}</div>}
          </div>
        )}

        <div>
          <div className="text-xs font-semibold mb-2">Ações</div>
          <div className="space-y-1">
            {actions.map((a) => (
              <button key={a.id} onClick={() => toggleAction(a)}
                className="flex items-center gap-2 w-full text-left text-sm py-1 px-2 rounded hover:bg-accent">
                <CheckCircle2 className={`size-4 ${a.done ? "text-primary" : "text-muted-foreground"}`} />
                <span className={a.done ? "line-through text-muted-foreground" : ""}>{a.title}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input className="h-8 text-sm" placeholder="Nova ação..." value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAction()} />
            <Button size="sm" onClick={addAction}>Adicionar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
