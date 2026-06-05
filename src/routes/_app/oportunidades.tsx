import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Briefcase, Sparkles, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { formatCurrencyCompact } from "@/utils/formatters";
import { useServerFn } from "@tanstack/react-start";
import { findForgottenOpportunities } from "@/lib/intelligence.functions";
import { motion } from "framer-motion";


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
  const getOpportunities = useServerFn(findForgottenOpportunities);

  const { data: forgotten, isLoading: loadingForgotten } = useQuery({
    queryKey: ["forgotten-opps"],
    queryFn: () => getOpportunities({}),
  });


  const { data: opps } = useQuery({
    queryKey: ["opps"],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("*").order("created_at", { ascending: false }).limit(2000);
      return data ?? [];
    },
  });
  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name").limit(2000)).data ?? [],
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Briefcase className="size-6 text-primary" /> Oportunidades
          </h1>
          <p className="text-sm text-muted-foreground">
            {opps?.length ?? 0} oportunidades · R$ {formatCurrencyCompact(totalValue)}
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

      {/* Seção de Oportunidades Esquecidas (IA) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card className="bg-primary/5 border-primary/20 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> Sugestões da IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Identificamos lacunas no mix de produtos de clientes ativos com base no comportamento de compras da região.
              </p>
              <div className="mt-4 p-3 bg-white/50 rounded-lg border border-primary/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Métrica de Impacto</div>
                <div className="text-xl font-bold">R$ 1.2M</div>
                <div className="text-[10px] text-muted-foreground italic">Potencial de cross-sell estimado</div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingForgotten ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
              ))
            ) : forgotten?.map((op: any, i: number) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={i}
              >
                <Card className="hover:border-primary/40 transition-all group overflow-hidden border-2 h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                       <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                         Cross-Sell
                       </Badge>
                       <ShoppingBag className="size-4 text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />
                    </div>
                    <CardTitle className="text-sm font-bold truncate">{op.line}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-xs text-muted-foreground">
                      Cliente com perfil compatível não possui compras nesta linha nos últimos 6 meses.
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs hover:bg-primary/10 hover:text-primary font-bold" asChild>
                      <Link to={`/clientes?id=${op.clientId}`}>
                        Ver Cliente <ArrowRight className="size-3 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-lg font-semibold mb-4">Pipeline de Vendas Tradicional</h2>


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
