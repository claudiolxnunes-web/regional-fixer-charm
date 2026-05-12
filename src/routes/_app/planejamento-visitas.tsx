import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Route as RouteIcon, MapPin, ChevronRight, Calendar, AlertTriangle, Package, Snowflake, Beef, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/planejamento-visitas")({ component: SpinPage });

function startOfWeek(d = new Date()) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1); // segunda
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function SpinPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7); return d;
  }, [weekStart]);

  const { data: activities } = useQuery({
    queryKey: ["spin-activities", weekStart.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("*, clients(id, name, city, state, lat, lng)")
        .eq("type", "visit")
        .gte("scheduled_at", weekStart.toISOString())
        .lt("scheduled_at", weekEnd.toISOString())
        .order("scheduled_at");
      return data ?? [];
    },
  });

  const { data: spinNotes } = useQuery({
    queryKey: ["spin-notes"],
    queryFn: async () => (await supabase.from("spin_notes").select("*").limit(500)).data ?? [],
  });

  // Prioridades: clientes a visitar por necessidade
  const { data: priorities } = useQuery({
    queryKey: ["visit-priorities"],
    queryFn: async () => {
      const today = new Date();
      const m3 = new Date(today); m3.setMonth(m3.getMonth() - 3);
      const m5 = new Date(today); m5.setMonth(m5.getMonth() - 5);
      const m6 = new Date(today); m6.setMonth(m6.getMonth() - 6);

      const [alertsRes, clientsRes] = await Promise.all([
        supabase
          .from("alerts")
          .select("*")
          .in("type", ["low_stock", "inactive_client", "consumption_drop"])
          .is("resolved_at", null)
          .order("severity", { ascending: false })
          .limit(200),
        supabase
          .from("clients")
          .select("id, name, city, state, production_type, farming_system, animal_types, last_purchase_date, status")
          .eq("status", "active")
          .limit(500),
      ]);
      const alerts = alertsRes.data ?? [];
      const clients = clientsRes.data ?? [];

      const restock = alerts.filter((a) => a.type === "low_stock");
      const nearInactive = alerts.filter(
        (a) => a.type === "inactive_client" && (a.metadata as any)?.months_inactive < 6
      );
      const confinement = clients.filter((c) => {
        const t = `${c.production_type ?? ""} ${c.farming_system ?? ""} ${c.animal_types ?? ""}`.toLowerCase();
        return /confina|engorda|terminaç/.test(t);
      });
      // Transição de estação: meses 3, 6, 9, 12 (entrada de outono/inverno/primavera/verão no Brasil)
      const currentMonth = today.getMonth() + 1;
      const seasonMonths = [3, 6, 9, 12];
      const isSeasonTransition = seasonMonths.includes(currentMonth);
      const seasonal = isSeasonTransition
        ? clients.filter((c) => {
            const t = `${c.production_type ?? ""} ${c.animal_types ?? ""}`.toLowerCase();
            return /pasto|cria|recria|leite|corte|aves|suín/.test(t);
          })
        : [];

      return { restock, nearInactive, confinement, seasonal, isSeasonTransition };
    },
  });

  const byDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    (activities ?? []).forEach((a) => {
      if (!a.scheduled_at) return;
      const k = new Date(a.scheduled_at).toISOString().slice(0, 10);
      (map[k] ??= []).push(a);
    });
    // ordenar por proximidade dentro do dia (vizinho mais próximo a partir do primeiro)
    Object.keys(map).forEach((k) => {
      const items = map[k];
      const ordered: any[] = [];
      const remaining = [...items];
      let current = remaining.shift();
      if (current) ordered.push(current);
      while (remaining.length && current?.clients?.lat && current?.clients?.lng) {
        let bestIdx = 0; let bestDist = Infinity;
        remaining.forEach((r, i) => {
          if (!r.clients?.lat || !r.clients?.lng) return;
          const d = Math.hypot(r.clients.lat - current.clients.lat, r.clients.lng - current.clients.lng);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        current = remaining.splice(bestIdx, 1)[0];
        ordered.push(current);
      }
      ordered.push(...remaining);
      map[k] = ordered;
    });
    return map;
  }, [activities]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
    });
  }, [weekStart]);

  const noteFor = (activityId: string) => (spinNotes ?? []).find((n) => n.activity_id === activityId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <RouteIcon className="size-6 text-primary" /> Planejamento de Visitas (SPIN)
          </h1>
          <p className="text-sm text-muted-foreground">Roteiro semanal otimizado por proximidade. Use o método SPIN: Situação · Problema · Implicação · Necessidade.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}>← Semana anterior</Button>
          <div className="text-sm font-medium px-2">
            {weekStart.toLocaleDateString("pt-BR")} – {new Date(weekEnd.getTime() - 1).toLocaleDateString("pt-BR")}
          </div>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}>Próxima semana →</Button>
        </div>
      </div>

      {/* Prioridades da semana */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="size-4 text-primary" /> Prioridades da semana
          </CardTitle>
          <p className="text-xs text-muted-foreground">Clientes que merecem atenção — use para montar o roteiro abaixo.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <PriorityColumn
              icon={<Package className="size-4" />}
              title="Reposição de estoque"
              tone="bg-amber-500/10 text-amber-600 border-amber-500/30"
              items={(priorities?.restock ?? []).map((a) => ({
                id: a.id, name: a.client_name ?? a.client_code ?? "Cliente", subtitle: a.message ?? "",
              }))}
              empty="Sem clientes em ponto de reposição."
            />
            <PriorityColumn
              icon={<Beef className="size-4" />}
              title="Início de confinamento"
              tone="bg-orange-500/10 text-orange-600 border-orange-500/30"
              items={(priorities?.confinement ?? []).slice(0, 20).map((c) => ({
                id: c.id, name: c.name, subtitle: `${c.city ?? ""}/${c.state ?? ""} · ${c.animal_types ?? c.production_type ?? ""}`,
              }))}
              empty="Nenhum cliente com perfil de confinamento."
            />
            <PriorityColumn
              icon={<Snowflake className="size-4" />}
              title={priorities?.isSeasonTransition ? "Transição de estação" : "Transição (fora de janela)"}
              tone="bg-sky-500/10 text-sky-600 border-sky-500/30"
              items={(priorities?.seasonal ?? []).slice(0, 20).map((c) => ({
                id: c.id, name: c.name, subtitle: `${c.city ?? ""}/${c.state ?? ""}`,
              }))}
              empty={priorities?.isSeasonTransition ? "Sem clientes sensíveis a estação." : "Janela ativa em mar/jun/set/dez."}
            />
            <PriorityColumn
              icon={<Clock className="size-4" />}
              title="Próximos da inativação"
              tone="bg-rose-500/10 text-rose-600 border-rose-500/30"
              items={(priorities?.nearInactive ?? []).map((a) => ({
                id: a.id, name: a.client_name ?? a.client_code ?? "Cliente",
                subtitle: `${(a.metadata as any)?.months_inactive ?? "?"} meses sem comprar — inativa em 6m`,
              }))}
              empty="Nenhum cliente entre 3 e 5 meses sem comprar."
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
        {days.map((d) => {
          const k = d.toISOString().slice(0, 10);
          const items = byDay[k] ?? [];
          const isToday = k === new Date().toISOString().slice(0, 10);
          return (
            <Card key={k} className={isToday ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" />
                  {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">—</p>}
                {items.map((a, idx) => {
                  const note = noteFor(a.id);
                  return (
                    <button key={a.id} onClick={() => setSelectedActivity(a)}
                      className="w-full text-left border rounded-md p-2 hover:bg-accent text-xs space-y-1">
                      <div className="flex items-center gap-1 font-medium">
                        <span className="size-4 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] shrink-0">{idx + 1}</span>
                        <span className="truncate">{a.title}</span>
                      </div>
                      {a.clients && (
                        <div className="text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="size-3 shrink-0" />
                          {a.clients.city}/{a.clients.state}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        {note ? <Badge variant="outline" className="text-[10px]">SPIN ✓</Badge> : <Badge variant="secondary" className="text-[10px]">Sem SPIN</Badge>}
                        {a.status === "completed" && <Badge className="text-[10px]">Concluída</Badge>}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!activities?.length && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma visita planejada nessa semana. Crie atividades do tipo <b>Visita</b> em <a href="/atividades" className="text-primary underline">/atividades</a>.
        </CardContent></Card>
      )}

      <SpinDialog
        activity={selectedActivity}
        existing={selectedActivity ? noteFor(selectedActivity.id) : null}
        userId={user?.id}
        onClose={() => setSelectedActivity(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["spin-notes"] })}
      />
    </div>
  );
}

function SpinDialog({ activity, existing, userId, onClose, onSaved }: { activity: any; existing: any; userId?: string; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState("spin");
  const [form, setForm] = useState({
    situation: existing?.situation ?? "",
    problem: existing?.problem ?? "",
    implication: existing?.implication ?? "",
    need_payoff: existing?.need_payoff ?? "",
    outcome: existing?.outcome ?? "",
    next_steps: existing?.next_steps ?? "",
  });

  // reset form when activity changes
  useMemo(() => {
    setForm({
      situation: existing?.situation ?? "",
      problem: existing?.problem ?? "",
      implication: existing?.implication ?? "",
      need_payoff: existing?.need_payoff ?? "",
      outcome: existing?.outcome ?? "",
      next_steps: existing?.next_steps ?? "",
    });
    setTab("spin");
  }, [activity?.id]);

  if (!activity) return null;

  async function save() {
    const payload = {
      ...form,
      activity_id: activity.id,
      client_id: activity.client_id,
      rep_user_id: userId,
    };
    let err;
    if (existing) {
      const r = await supabase.from("spin_notes").update(payload).eq("id", existing.id);
      err = r.error;
    } else {
      const r = await supabase.from("spin_notes").insert(payload);
      err = r.error;
    }
    if (err) return toast.error(err.message);
    toast.success("Anotações SPIN salvas");
    onSaved();
    onClose();
  }

  async function markCompleted() {
    await supabase.from("activities").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", activity.id);
    toast.success("Visita marcada como concluída");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={!!activity} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activity.title}
            <ChevronRight className="size-4 text-muted-foreground" />
            {activity.clients?.name ?? "Visita"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="spin">SPIN (pré-visita)</TabsTrigger>
            <TabsTrigger value="post">Pós-visita</TabsTrigger>
          </TabsList>

          <TabsContent value="spin" className="space-y-3 mt-3">
            <div>
              <Label><b className="text-primary">S</b> — Situação</Label>
              <Textarea rows={2} placeholder="Contexto atual: o que ele compra hoje, volume, fornecedores, sazonalidade..."
                value={form.situation} onChange={(e) => setForm({ ...form, situation: e.target.value })} />
            </div>
            <div>
              <Label><b className="text-primary">P</b> — Problema</Label>
              <Textarea rows={2} placeholder="Dor identificada: preço, atraso, qualidade, falta de produto, atendimento..."
                value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} />
            </div>
            <div>
              <Label><b className="text-primary">I</b> — Implicação</Label>
              <Textarea rows={2} placeholder="Consequência da dor: perda de margem, churn, retrabalho, risco operacional..."
                value={form.implication} onChange={(e) => setForm({ ...form, implication: e.target.value })} />
            </div>
            <div>
              <Label><b className="text-primary">N</b> — Necessidade de solução</Label>
              <Textarea rows={2} placeholder="Como nossa proposta resolve: produto X, condição Y, prazo Z..."
                value={form.need_payoff} onChange={(e) => setForm({ ...form, need_payoff: e.target.value })} />
            </div>
          </TabsContent>

          <TabsContent value="post" className="space-y-3 mt-3">
            <div>
              <Label>Resultado da visita</Label>
              <Textarea rows={3} placeholder="O que aconteceu? Concordou? Pediu proposta? Recusou?"
                value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
            </div>
            <div>
              <Label>Próximos passos</Label>
              <Textarea rows={3} placeholder="Enviar proposta até..., ligar dia..., agendar nova visita..."
                value={form.next_steps} onChange={(e) => setForm({ ...form, next_steps: e.target.value })} />
            </div>
            {activity.status !== "completed" && (
              <Button variant="outline" onClick={markCompleted} className="w-full">
                Marcar visita como concluída
              </Button>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
