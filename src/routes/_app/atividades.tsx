import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, MapPin, ClipboardCheck, Calendar, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/atividades")({ component: Atividades });

const TYPES: Record<string, { label: string; icon: any }> = {
  visit: { label: "Visita", icon: MapPin },
  call: { label: "Ligação", icon: Phone },
  task: { label: "Tarefa", icon: ClipboardCheck },
  meeting: { label: "Reunião", icon: Calendar },
};

const SUGGESTED_ACTIVITIES = [
  "Visita Técnica",
  "Prospecção de Novo Cliente",
  "Demonstração de Produto",
  "Entrega de Pedido",
  "Cobrança / Financeiro",
  "Acompanhamento Pós-Venda",
  "Treinamento / Dia de Campo",
  "Reunião de Fechamento",
];

function Atividades() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [form, setForm] = useState({ title: "", type: "visit", scheduled_at: "", description: "", client_id: "" });

  const { data: items } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => (await supabase.from("activities").select("*").order("scheduled_at", { ascending: false }).limit(300)).data ?? [],
  });
  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name").limit(500)).data ?? [],
  });

  const filtered = (items ?? []).filter((a) =>
    filter === "all" ? true : filter === "pending" ? a.status !== "completed" : a.status === "completed"
  );

  async function create() {
    if (!form.title) return toast.error("Título obrigatório");
    const { error } = await supabase.from("activities").insert({
      title: form.title,
      type: form.type,
      scheduled_at: form.scheduled_at || null,
      description: form.description || null,
      client_id: form.client_id || null,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Atividade criada");
    setOpen(false);
    setForm({ title: "", type: "visit", scheduled_at: "", description: "", client_id: "" });
    qc.invalidateQueries({ queryKey: ["activities"] });
  }

  async function complete(id: string) {
    const { error } = await supabase.from("activities").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["activities"] });
  }

  const stats = {
    total: items?.length ?? 0,
    pending: (items ?? []).filter((a) => a.status !== "completed").length,
    done: (items ?? []).filter((a) => a.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Atividades</h1>
          <p className="text-sm text-muted-foreground">Visitas, ligações, reuniões e tarefas dos representantes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Nova atividade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova atividade</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Atividade</Label>
                <Select 
                  value={SUGGESTED_ACTIVITIES.includes(form.title) ? form.title : (form.title ? "other" : "")} 
                  onValueChange={(v) => {
                    if (v === "other") {
                      setForm({ ...form, title: "" });
                    } else {
                      setForm({ ...form, title: v });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a atividade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUGGESTED_ACTIVITIES.map(act => (
                      <SelectItem key={act} value={act}>{act}</SelectItem>
                    ))}
                    <SelectItem value="other">Outros (especificar...)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(!SUGGESTED_ACTIVITIES.includes(form.title) || !form.title) && (
                <div className="mt-2">
                  <Label>Título Específico</Label>
                  <Input 
                    value={form.title} 
                    onChange={(e) => setForm({ ...form, title: e.target.value })} 
                    placeholder="Descreva a atividade..."
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Cliente (Opcional)</Label>
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30">
                  {(!clients || clients.length === 0) && (
                    <p className="text-[10px] text-muted-foreground w-full text-center">Carregando clientes...</p>
                  )}
                  {clients?.slice(0, 8).map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      variant={form.client_id === c.id ? "default" : "outline"}
                      className="h-7 px-2 text-[10px]"
                      onClick={() => setForm({ ...form, client_id: c.id })}
                    >
                      {c.name}
                    </Button>
                  ))}
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger className="h-7 text-[10px]">
                      <SelectValue placeholder="Mais clientes..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(clients ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-xl font-semibold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Pendentes</div><div className="text-xl font-semibold">{stats.pending}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Concluídas</div><div className="text-xl font-semibold">{stats.done}</div></CardContent></Card>
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "done"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "Todas" : f === "pending" ? "Pendentes" : "Concluídas"}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Lista</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {filtered.map((a) => {
            const T = TYPES[a.type] ?? TYPES.task;
            const Icon = T.icon;
            return (
              <div key={a.id} className="flex items-center gap-3 border rounded-md p-3">
                <div className="size-9 rounded-md bg-primary/10 grid place-items-center"><Icon className="size-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {T.label}{a.scheduled_at ? ` · ${new Date(a.scheduled_at).toLocaleString("pt-BR")}` : ""}
                  </div>
                </div>
                <Badge variant={a.status === "completed" ? "secondary" : "default"}>{a.status === "completed" ? "Concluída" : "Pendente"}</Badge>
                {a.status !== "completed" && (
                  <Button size="sm" variant="ghost" onClick={() => complete(a.id)}><CheckCircle2 className="size-4" /></Button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
