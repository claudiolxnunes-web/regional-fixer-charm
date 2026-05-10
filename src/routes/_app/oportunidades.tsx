import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/oportunidades")({ component: Oportunidades });

const STAGES = [
  { key: "prospecting", label: "Prospecção" },
  { key: "qualification", label: "Qualificação" },
  { key: "proposal", label: "Proposta" },
  { key: "negotiation", label: "Negociação" },
  { key: "won", label: "Ganhas" },
  { key: "lost", label: "Perdidas" },
];

function Oportunidades() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", value: "", stage: "prospecting", probability: "30", client_id: "", notes: "" });

  const { data: opps } = useQuery({
    queryKey: ["opps"],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("*").order("created_at", { ascending: false }).limit(500);
      return data ?? [];
    },
  });
  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name").limit(500)).data ?? [],
  });

  const totalValue = (opps ?? []).reduce((s, o) => s + Number(o.value ?? 0), 0);

  async function create() {
    if (!form.title) return toast.error("Título obrigatório");
    const { error } = await supabase.from("opportunities").insert({
      title: form.title,
      value: Number(form.value || 0),
      stage: form.stage as any,
      probability: Number(form.probability || 0),
      client_id: form.client_id || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Oportunidade criada");
    setOpen(false);
    setForm({ title: "", value: "", stage: "prospecting", probability: "30", client_id: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["opps"] });
  }

  async function moveStage(id: string, stage: string) {
    const { error } = await supabase.from("opportunities").update({ stage: stage as any }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["opps"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Oportunidades</h1>
          <p className="text-sm text-muted-foreground">
            {opps?.length ?? 0} oportunidades · R$ {totalValue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Nova oportunidade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova oportunidade</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (R$)</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
                <div><Label>Probabilidade (%)</Label><Input type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></div>
              </div>
              <div>
                <Label>Estágio</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                  <SelectContent>{(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map((s) => {
          const list = (opps ?? []).filter((o) => o.stage === s.key);
          const sum = list.reduce((a, b) => a + Number(b.value ?? 0), 0);
          return (
            <Card key={s.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{s.label}</span>
                  <Badge variant="outline">{list.length}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">R$ {sum.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                {list.map((o) => (
                  <div key={o.id} className="border rounded-md p-2 text-xs space-y-1 bg-card">
                    <div className="font-medium truncate">{o.title}</div>
                    <div className="text-muted-foreground">R$ {Number(o.value ?? 0).toLocaleString("pt-BR")} · {o.probability ?? 0}%</div>
                    <Select value={o.stage} onValueChange={(v) => moveStage(o.id, v)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
                {list.length === 0 && <p className="text-xs text-muted-foreground italic">Vazio</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
