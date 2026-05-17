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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Route as RouteIcon, MapPin, ChevronRight, Calendar, AlertTriangle, Package, Snowflake, Beef, Clock, Download, Target, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/planejamento-visitas")({ component: SpinPage });

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
  const [newPlanOpen, setNewPlanOpen] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name").limit(500)).data ?? [],
  });

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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}>← Semana anterior</Button>
          <div className="text-sm font-medium px-2">
            {weekStart.toLocaleDateString("pt-BR")} – {new Date(weekEnd.getTime() - 1).toLocaleDateString("pt-BR")}
          </div>
          <Button variant="outline" size="sm" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}>Próxima semana →</Button>
          <Button size="sm" variant="outline" onClick={() => setNewPlanOpen(true)}>
            <Plus className="size-4 mr-1" /> Novo Planejamento
          </Button>
          <Button size="sm" variant="secondary" onClick={() => exportWeeklyRoteiro(weekStart, days, byDay, spinNotes ?? [])}>
            <Download className="size-4 mr-1" /> Baixar roteiro
          </Button>
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

      <NewActivityDialog
        open={newPlanOpen}
        onClose={() => setNewPlanOpen(false)}
        clients={clients ?? []}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["spin-activities"] });
        }}
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
    smart_objective: existing?.smart_objective ?? "",
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
      smart_objective: existing?.smart_objective ?? "",
    });
    setTab("spin");
  }, [activity?.id, existing?.id]);

  if (!activity) return null;

  function missingSpin() {
    const labels: Record<string, string> = {
      situation: "S (Situação)",
      problem: "P (Problema)",
      implication: "I (Implicação)",
      need_payoff: "N (Necessidade)",
    };
    return Object.entries(labels)
      .filter(([k]) => !(form as any)[k]?.trim())
      .map(([, v]) => v);
  }

  async function save(opts: { force?: boolean } = {}) {
    const missing = missingSpin();
    if (missing.length && !opts.force) {
      toast.warning(`Faltam: ${missing.join(", ")}`, {
        description: "Você pode salvar mesmo assim ou completar antes.",
        action: { label: "Salvar assim mesmo", onClick: () => save({ force: true }) },
      });
      return;
    }
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

  function exportRoteiro() {
    const missing = missingSpin();
    if (missing.length) {
      toast.error(`Não é possível exportar: faltam ${missing.join(", ")}`);
      return;
    }
    const text = [
      `Roteiro SPIN — ${activity.clients?.name ?? activity.title}`,
      `Data: ${activity.scheduled_at ? new Date(activity.scheduled_at).toLocaleString("pt-BR") : "-"}`,
      "",
      `S — Situação:\n${form.situation}`,
      "",
      `P — Problema:\n${form.problem}`,
      "",
      `I — Implicação:\n${form.implication}`,
      "",
      `N — Necessidade:\n${form.need_payoff}`,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spin-${(activity.clients?.name ?? "visita").toString().toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Roteiro exportado");
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                4 perguntas-chave. Foque em <b>uma</b> por etapa — visita de 30-60 min.
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => setForm((f) => ({
                ...f,
                situation: f.situation || 'Quantos animais estão em confinamento hoje? Qual o volume mensal de ração utilizado e quais fornecedores atendem?',
                problem: f.problem || 'Quais desafios enfrenta com o fornecedor atual (preço, prazo, qualidade)? O que impede maior ganho de peso ou eficiência alimentar?',
                implication: f.implication || 'Quanto isso custa por mês em perda de margem ou retrabalho? Como afeta o resultado no fechamento do ciclo?',
                need_payoff: f.need_payoff || 'O que mudaria se resolvêssemos esse ponto? Quanto ganhariam em produtividade/lucro com a nossa solução?',
              }))}>
                Preencher com perguntas-modelo
              </Button>
            </div>
            <div>
              <Label><b className="text-primary">S</b> — Situação <span className="text-muted-foreground font-normal">(fato atual)</span></Label>
              <Textarea rows={2} placeholder='Ex.: "Quantos animais estão em confinamento hoje?" / "Qual o volume mensal de ração?"'
                value={form.situation} onChange={(e) => setForm({ ...form, situation: e.target.value })} />
            </div>
            <div>
              <Label><b className="text-primary">P</b> — Problema <span className="text-muted-foreground font-normal">(dor explícita)</span></Label>
              <Textarea rows={2} placeholder='Ex.: "Quais desafios tem com o fornecedor atual?" / "O que impede maior ganho de peso?"'
                value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} />
            </div>
            <div>
              <Label><b className="text-primary">I</b> — Implicação <span className="text-muted-foreground font-normal">(consequência)</span></Label>
              <Textarea rows={2} placeholder='Ex.: "Quanto isso custa por mês?" / "Como isso afeta sua margem no fim do ciclo?"'
                value={form.implication} onChange={(e) => setForm({ ...form, implication: e.target.value })} />
            </div>
            <div>
              <Label><b className="text-primary">N</b> — Necessidade <span className="text-muted-foreground font-normal">(ganho)</span></Label>
              <Textarea rows={2} placeholder='Ex.: "O que mudaria se resolvêssemos isso?" / "Quanto ganhariam com X?"'
                value={form.need_payoff} onChange={(e) => setForm({ ...form, need_payoff: e.target.value })} />
            </div>
          </TabsContent>

          <TabsContent value="post" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Registre em até 24-48h. Um campo só: o que ficou combinado e quando.
            </p>
            <div>
              <Label>Resultado + próximo passo</Label>
              <Textarea rows={5}
                placeholder="Ex.: Cliente pediu proposta de 5t para entrega dia 20. Enviar amanhã e ligar na quinta para fechar."
                value={form.next_steps}
                onChange={(e) => setForm({ ...form, next_steps: e.target.value, outcome: e.target.value })} />
            </div>
            {activity.status !== "completed" && (
              <Button variant="outline" onClick={markCompleted} className="w-full">
                Marcar visita como concluída
              </Button>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="outline" onClick={exportRoteiro}>Exportar roteiro</Button>
          <Button onClick={() => save()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PriorityColumn({ icon, title, tone, items, empty }: {
  icon: React.ReactNode; title: string; tone: string;
  items: { id: string; name: string; subtitle?: string }[]; empty: string;
}) {
  return (
    <div className={`border rounded-lg ${tone}`}>
      <div className="px-3 py-2 border-b border-current/10 flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
        <Badge variant="outline" className="ml-auto text-[10px] bg-background">{items.length}</Badge>
      </div>
      <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
        {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">{empty}</p>}
        {items.map((it) => (
          <div key={it.id} className="text-xs bg-background/60 rounded px-2 py-1.5 border border-current/10">
            <div className="font-medium text-foreground truncate">{it.name}</div>
            {it.subtitle && <div className="text-muted-foreground truncate text-[11px]">{it.subtitle}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function exportWeeklyRoteiro(weekStart: Date, days: Date[], byDay: Record<string, any[]>, spinNotes: any[]) {
  const noteFor = (id: string) => spinNotes.find((n) => n.activity_id === id);
  const lines: string[] = [];
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  lines.push("ROTEIRO SEMANAL DE VISITAS — SPIN");
  lines.push(`Semana: ${weekStart.toLocaleDateString("pt-BR")} a ${weekEnd.toLocaleDateString("pt-BR")}`);
  lines.push("=".repeat(60));
  lines.push("");

  let totalVisits = 0;
  days.forEach((d) => {
    const k = d.toISOString().slice(0, 10);
    const items = byDay[k] ?? [];
    if (!items.length) return;
    lines.push(d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).toUpperCase());
    lines.push("-".repeat(60));
    items.forEach((a, idx) => {
      totalVisits++;
      const c = a.clients;
      lines.push(`${idx + 1}. ${c?.name ?? a.title}`);
      if (c?.address || c?.city) lines.push(`   📍 ${[c?.address, c?.city, c?.state].filter(Boolean).join(", ")}`);
      const note = noteFor(a.id);
      if (note) {
        lines.push(`   ✓ SPIN registrado`);
      } else {
        lines.push(`   [ ] S — Situação: _____________________________________`);
        lines.push(`   [ ] P — Problema: _____________________________________`);
        lines.push(`   [ ] I — Implicação: ___________________________________`);
        lines.push(`   [ ] N — Necessidade: __________________________________`);
      }
      lines.push("");
    });
    lines.push("");
  });

  if (totalVisits === 0) {
    lines.push("Nenhuma visita planejada nessa semana.");
  } else {
    lines.push("=".repeat(60));
    lines.push(`Total: ${totalVisits} visitas`);
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roteiro-semana-${weekStart.toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function NewActivityDialog({ open, onClose, clients, onCreated }: { open: boolean; onClose: () => void; clients: any[]; onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", type: "visit", scheduled_at: "", description: "", client_id: "" });
  const [isOther, setIsOther] = useState(false);

  async function create() {
    if (!form.title && !isOther) return toast.error("Selecione ou descreva a atividade");
    if (isOther && !form.title) return toast.error("Descreva a atividade");
    
    const { error } = await supabase.from("activities").insert({
      title: form.title,
      type: form.type,
      scheduled_at: form.scheduled_at || new Date().toISOString(),
      description: form.description || null,
      client_id: form.client_id || null,
      status: "pending",
    });
    
    if (error) return toast.error(error.message);
    toast.success("Atividade planejada com sucesso");
    onCreated();
    onClose();
    setForm({ title: "", type: "visit", scheduled_at: "", description: "", client_id: "" });
    setIsOther(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Planejar Nova Atividade</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Atividade Principal</Label>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_ACTIVITIES.map((act) => (
                <Button 
                  key={act} 
                  variant={form.title === act && !isOther ? "default" : "outline"} 
                  className="text-xs h-auto py-2 px-1 text-center whitespace-normal leading-tight"
                  onClick={() => {
                    setForm({ ...form, title: act });
                    setIsOther(false);
                  }}
                >
                  {act}
                </Button>
              ))}
              <Button 
                variant={isOther ? "default" : "outline"} 
                className="text-xs h-auto py-2 px-1 text-center"
                onClick={() => {
                  setIsOther(true);
                  if (!SUGGESTED_ACTIVITIES.includes(form.title)) {
                    // keep it
                  } else {
                    setForm({ ...form, title: "" });
                  }
                }}
              >
                Outros...
              </Button>
            </div>
          </div>

          {isOther && (
            <div className="space-y-2">
              <Label>Descrição da Atividade</Label>
              <Input 
                placeholder="Ex: Entrega de amostras específicas" 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data/Hora</Label>
              <Input 
                type="datetime-local" 
                value={form.scheduled_at} 
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visit">Visita</SelectItem>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="task">Tarefa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cliente (Opcional)</Label>
            <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30">
              {(!clients || clients.length === 0) && (
                <p className="text-[10px] text-muted-foreground w-full text-center">Carregando clientes...</p>
              )}
              {clients?.slice(0, 10).map((c: any) => (
                <Button
                  key={c.id}
                  type="button"
                  variant={form.client_id === c.id ? "default" : "outline"}
                  className="h-7 px-2 text-[10px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]"
                  onClick={() => setForm({ ...form, client_id: form.client_id === c.id ? "" : c.id })}
                >
                  {c.name}
                </Button>
              ))}
              <div className="w-full mt-1">
                <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-7 text-[10px] w-full">
                    <SelectValue placeholder="Pesquisar todos os clientes..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea 
              placeholder="Detalhes adicionais..." 
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={create}>Salvar no Planejamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
