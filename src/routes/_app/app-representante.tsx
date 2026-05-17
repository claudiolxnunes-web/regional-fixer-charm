import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Home, Phone, FileText, ShoppingCart, Plus, Send, LogOut,
  Users, MapPin, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { RepTodayPanel } from "@/components/RepTodayPanel";
import { InstallAppButton } from "@/components/InstallAppButton";

export const Route = createFileRoute("/_app/app-representante")({ component: RepAppPage });

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

function RepAppPage() {
  const { user, isRepresentative, isStaff, signOut } = useAuth();

  const { data: rep, isLoading } = useQuery({
    queryKey: ["my_rep", user?.id, isStaff],
    enabled: !!user?.id,
    queryFn: async () => {
      // 1) Tenta o RC vinculado ao usuário
      const { data: mine, error } = await supabase
        .from("representatives")
        .select("id, rep_code, name, territory, home_state, home_city")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (mine) return { ...mine, _preview: false } as any;

      // 2) Fallback para gestor/superadmin: usa o 1º representante da equipe (modo preview)
      if (isStaff) {
        const { data: any1 } = await supabase
          .from("representatives")
          .select("id, rep_code, name, territory, home_state, home_city")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (any1) return { ...any1, _preview: true } as any;
      }
      return null;
    },
  });

  if (!isRepresentative && !isStaff) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-3">
        <p className="text-muted-foreground">Esta área é para representantes.</p>
        <p className="text-xs text-muted-foreground">Peça ao administrador para vincular seu usuário a um cadastro de representante.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="max-w-md mx-auto py-12 text-center text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!rep) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-3">
        <p className="text-muted-foreground">Nenhum representante cadastrado ainda.</p>
        {isStaff && <p className="text-xs text-muted-foreground">Cadastre um representante em /representantes para visualizar o app.</p>}
      </div>
    );
  }

  return <RepDashboard rep={rep} signOut={signOut} />;
}

function RepDashboard({ rep, signOut }: { rep: any; signOut: () => Promise<void> }) {
  const qc = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const [observations, setObservations] = useState("");

  // Today's activities (visits/calls/proposals/orders)
  const { data: activities = [] } = useQuery({
    queryKey: ["rep_activities_today", rep.id],
    queryFn: async () => {
      const start = `${todayStr()}T00:00:00`;
      const { data, error } = await supabase
        .from("activities")
        .select("id, type")
        .eq("representative_id", rep.id)
        .gte("created_at", start);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: quotesToday = [] } = useQuery({
    queryKey: ["rep_quotes_today"],
    queryFn: async () => {
      const start = `${todayStr()}T00:00:00`;
      const { data, error } = await (supabase as any).from("quotes").select("id").gte("created_at", start);
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const c = { visit: 0, call: 0, proposal: 0, order: 0 };
    activities.forEach((a: any) => {
      const t = (a.type ?? "").toLowerCase();
      if (t === "visit" || t === "visita") c.visit++;
      else if (t === "call" || t === "ligacao" || t === "ligação") c.call++;
      else if (t === "proposal" || t === "proposta") c.proposal++;
      else if (t === "order" || t === "pedido") c.order++;
    });
    c.proposal += quotesToday.length;
    return c;
  }, [activities, quotesToday]);

  const sendReport = useMutation({
    mutationFn: async () => {
      const payload = {
        representative_id: rep.id,
        report_date: todayStr(),
        visits_count: counts.visit,
        calls_count: counts.call,
        proposals_count: counts.proposal,
        orders_count: counts.order,
        observations: observations || null,
        submitted_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from("daily_reports")
        .upsert(payload, { onConflict: "rep_user_id,report_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Relatório enviado ao gestor!");
      setObservations("");
      qc.invalidateQueries({ queryKey: ["rep_activities_today"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-md mx-auto -mx-8 -my-6 md:mx-auto md:my-0 md:max-w-lg">
      {rep._preview && (
        <div className="bg-amber-100 text-amber-900 text-[11px] px-3 py-1.5 text-center border-b border-amber-200">
          Modo visualização — você está vendo o app como o representante <strong>{rep.name}</strong>.
        </div>
      )}
      {/* Header */}
      <div className="bg-emerald-700 text-emerald-50 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow">
        <div className="size-9 rounded-full bg-emerald-800/60 grid place-items-center text-emerald-100 font-semibold">
          {rep.name?.charAt(0) ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate uppercase">
            {rep.name} {rep.rep_code && <span className="opacity-80">— código {rep.rep_code}</span>}
          </div>
          <div className="text-[11px] opacity-80 truncate">
            {rep.territory || rep.home_state || ""}
            {rep.home_city ? ` · ${rep.home_city}` : ""}
          </div>
        </div>
        <div className="text-right text-[11px]">
          <div className="opacity-80">Hoje</div>
          <div className="font-semibold">{fmtDate(new Date())}</div>
        </div>
        <Button size="icon" variant="ghost" className="text-emerald-50 hover:bg-emerald-800/60" onClick={signOut}>
          <LogOut className="size-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4 pb-20">
        {/* Banner instalar como app (PWA) */}
        <InstallAppButton />

        {/* Painel "Hoje" — orientação rápida em campo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Calendar className="size-4 text-emerald-600" /> Agenda de Hoje
            </h2>
            <Link to="/planejamento-visitas" className="text-[10px] text-emerald-600 font-medium">Ver semana completa</Link>
          </div>
          <RepTodayPanel repId={rep.id} />
        </div>

        {/* Counters */}
        <div className="grid grid-cols-4 gap-2">
          <CounterCard color="emerald" icon={<Home className="size-5" />} label="Visitas" count={counts.visit} />
          <CounterCard color="rose" icon={<Phone className="size-5" />} label="Ligações" count={counts.call} />
          <CounterCard color="amber" icon={<FileText className="size-5" />} label="Propostas" count={counts.proposal} />
          <CounterCard color="slate" icon={<ShoppingCart className="size-5" />} label="Pedidos" count={counts.order} />
        </div>

        {/* Action: register */}
        <div className="grid grid-cols-1 gap-2">
          <Button
            size="lg"
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold shadow flex flex-col items-center justify-center py-0"
            onClick={() => setOpenForm(true)}
          >
            <div className="flex items-center">
              <Plus className="size-5 mr-2" /> Registro de Atividade
            </div>
            <span className="text-[10px] opacity-80 font-normal">Check-in, Visita ou Ligação</span>
          </Button>
        </div>

        {/* Secondary tabs: my carteira */}
        <Tabs defaultValue="clientes" className="pt-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="clientes" className="text-xs">
              <Users className="size-3.5 mr-1.5" />Minha Carteira
            </TabsTrigger>
            <TabsTrigger value="historico" className="text-xs">
              <Calendar className="size-3.5 mr-1.5" />Meu Histórico
            </TabsTrigger>
          </TabsList>
          <TabsContent value="clientes" className="mt-4">
            <MyClients repId={rep.id} />
          </TabsContent>
          <TabsContent value="historico" className="mt-4">
            <MyHistory repId={rep.id} />
          </TabsContent>
        </Tabs>

        {/* Daily observations (at the end) */}
        <Card className="p-4 space-y-3 border-emerald-100 bg-emerald-50/30">
          <Label className="flex items-center gap-1.5 text-sm">
            📝 <span className="font-semibold italic">Fechamento do Dia</span>
          </Label>
          <Textarea
            placeholder="Resumo geral: como foi o mercado hoje? Alguma dificuldade ou oportunidade?"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            className="bg-white"
          />
          <Button
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={() => sendReport.mutate()}
            disabled={sendReport.isPending}
          >
            <Send className="size-4 mr-2" />
            {sendReport.isPending ? "Enviando..." : "Enviar Relatório Diário"}
          </Button>
        </Card>
      </div>

      <ActivityFormDialog open={openForm} onOpenChange={setOpenForm} rep={rep} />
    </div>
  );
}

function CounterCard({ color, icon, label, count }: { color: string; icon: React.ReactNode; label: string; count: number }) {
  const map: Record<string, string> = {
    emerald: "border-emerald-300 bg-emerald-50 text-emerald-700",
    rose: "border-rose-300 bg-rose-50 text-rose-700",
    amber: "border-amber-300 bg-amber-50 text-amber-700",
    slate: "border-slate-300 bg-slate-50 text-slate-700",
  };
  return (
    <div className={`rounded-lg border-2 ${map[color]} py-3 flex flex-col items-center gap-1`}>
      {icon}
      <div className="text-2xl font-bold leading-none">{count}</div>
      <div className="text-[11px] font-medium">{label}</div>
    </div>
  );
}

function MyClients({ repId }: { repId: string }) {
  const [search, setSearch] = useState("");
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["rep_my_clients", repId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, client_code, city, state, production_type")
        .eq("representative_id", repId)
        .order("name")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return clients;
    const s = search.toLowerCase();
    return clients.filter(c => 
      c.name?.toLowerCase().includes(s) || 
      c.client_code?.toLowerCase().includes(s) ||
      c.city?.toLowerCase().includes(s)
    );
  }, [clients, search]);

  if (isLoading) return <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input 
          placeholder="Buscar cliente na carteira..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 text-sm pl-9"
        />
        <Users className="absolute left-3 top-3 size-4 text-muted-foreground" />
      </div>

      <div className="space-y-2 max-h-[400px] overflow-auto pb-4">
        {filtered.map((c: any) => (
          <Card key={c.id} className="p-3 flex items-center gap-3 active:bg-accent transition-colors">
            <div className="size-10 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center text-sm font-semibold shrink-0">
              {c.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-slate-900">{c.name}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                {c.client_code && <span className="font-mono bg-slate-100 px-1 rounded">#{c.client_code}</span>}
                {c.city && <><MapPin className="size-3" />{c.city}/{c.state}</>}
              </div>
              {c.production_type && (
                <div className="text-[10px] text-emerald-600 font-medium mt-0.5 uppercase tracking-tight">
                  {c.production_type}
                </div>
              )}
            </div>
            <Button size="icon" variant="ghost" className="size-8" asChild>
              <Link to={`/clientes?search=${c.name}`}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </Card>
        ))}
        {!filtered.length && (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhum cliente encontrado.</p>
        )}
      </div>
    </div>
  );
}

function MyHistory({ repId }: { repId: string }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["rep_history", repId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, title, type, status, created_at")
        .eq("representative_id", repId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>;
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>;

  return (
    <div className="space-y-2 max-h-80 overflow-auto">
      {items.map((a: any) => (
        <Card key={a.id} className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{a.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(a.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">{a.type}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

// =================== Activity Form Dialog ===================

type ActivityType = "visit" | "call" | "proposal" | "order";

function ActivityFormDialog({ open, onOpenChange, rep }: { open: boolean; onOpenChange: (v: boolean) => void; rep: any }) {
  const [tab, setTab] = useState<ActivityType>("visit");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova atividade</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as ActivityType)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="visit" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
              <div className="flex flex-col items-center gap-0.5"><Home className="size-4" /><span className="text-[10px]">Visita</span></div>
            </TabsTrigger>
            <TabsTrigger value="call" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700">
              <div className="flex flex-col items-center gap-0.5"><Phone className="size-4" /><span className="text-[10px]">Ligação</span></div>
            </TabsTrigger>
            <TabsTrigger value="proposal" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
              <div className="flex flex-col items-center gap-0.5"><FileText className="size-4" /><span className="text-[10px]">Proposta</span></div>
            </TabsTrigger>
            <TabsTrigger value="order" className="data-[state=active]:bg-slate-200 data-[state=active]:text-slate-800">
              <div className="flex flex-col items-center gap-0.5"><ShoppingCart className="size-4" /><span className="text-[10px]">Pedido</span></div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visit"><VisitOrCallForm rep={rep} type="visit" onClose={() => onOpenChange(false)} /></TabsContent>
          <TabsContent value="call"><VisitOrCallForm rep={rep} type="call" onClose={() => onOpenChange(false)} /></TabsContent>
          <TabsContent value="proposal"><ProposalForm rep={rep} onClose={() => onOpenChange(false)} /></TabsContent>
          <TabsContent value="order"><OrderForm rep={rep} onClose={() => onOpenChange(false)} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function VisitOrCallForm({ rep, type, onClose }: { rep: any; type: "visit" | "call"; onClose: () => void }) {
  const qc = useQueryClient();
  const [client, setClient] = useState("");
  const [motive, setMotive] = useState("");
  const [duration, setDuration] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").insert({
        representative_id: rep.id,
        type,
        title: `${type === "visit" ? "Visita" : "Ligação"} — ${client}`,
        description: motive,
        duration: Number(duration) || null,
        outcome: outcome || null,
        location: notes || null,
        status: "completed",
        completed_at: new Date().toISOString(),
        scheduled_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(type === "visit" ? "Visita registrada" : "Ligação registrada");
      qc.invalidateQueries({ queryKey: ["rep_activities_today"] });
      qc.invalidateQueries({ queryKey: ["rep_history"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 pt-3">
      <Field label="Cliente *"><Input placeholder="Nome do cliente / fazenda" value={client} onChange={(e) => setClient(e.target.value)} /></Field>
      <Field label={type === "visit" ? "Motivo da visita *" : "Motivo da ligação *"}>
        <Input placeholder="Ex: Apresentação de novo produto" value={motive} onChange={(e) => setMotive(e.target.value)} />
      </Field>
      <Field label="Duração (minutos)"><Input type="number" placeholder="Ex: 45" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
      <Field label="Resultado"><Input placeholder="Ex: Cliente interessado, retorno em 3 dias" value={outcome} onChange={(e) => setOutcome(e.target.value)} /></Field>
      <Field label="Observações"><Textarea placeholder="Detalhes adicionais..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <DialogFooter className="gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => save.mutate()} disabled={!client || !motive || save.isPending}>
          {save.isPending ? "Salvando..." : "Adicionar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ProposalForm({ rep, onClose }: { rep: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [client, setClient] = useState("");
  const [products, setProducts] = useState("");
  const [total, setTotal] = useState("");
  const [terms, setTerms] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { data: inserted, error } = await (supabase as any).from("quotes").insert({
        representative_id: rep.id,
        client_name: client,
        items: products ? [{ description: products }] : [],
        total: Number(total) || 0,
        payment_terms: terms || null,
        valid_until: validUntil || null,
        notes: notes || null,
        status: "pending",
      }).select("id").single();
      if (error) throw error;
      // Notifica gestores (best-effort)
      if (inserted?.id) {
        try {
          const { notifyQuoteCreated } = await import("@/lib/email.functions");
          await notifyQuoteCreated({ data: { quoteId: inserted.id } });
        } catch (e) {
          console.warn("notifyQuoteCreated failed", e);
        }
      }
    },
    onSuccess: () => {
      toast.success("Proposta enviada para aprovação do gestor");
      qc.invalidateQueries({ queryKey: ["rep_quotes_today"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 pt-3">
      <Field label="Cliente *"><Input placeholder="Nome do cliente / fazenda" value={client} onChange={(e) => setClient(e.target.value)} /></Field>
      <Field label="Produtos / quantidades *"><Textarea rows={2} placeholder="Ex: 60 sc Tecnobov Pasto HD, 100 sc Tecnobov Conf Beef" value={products} onChange={(e) => setProducts(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Valor total (R$) *"><Input type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} /></Field>
        <Field label="Validade"><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></Field>
      </div>
      <Field label="Condição de pagamento"><Input placeholder="Ex: 30/60/90 dias" value={terms} onChange={(e) => setTerms(e.target.value)} /></Field>
      <Field label="Observações"><Textarea placeholder="Detalhes adicionais..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <DialogFooter className="gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => save.mutate()} disabled={!client || !products || !total || save.isPending}>
          {save.isPending ? "Enviando..." : "Enviar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function OrderForm({ rep, onClose }: { rep: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [client, setClient] = useState("");
  const [products, setProducts] = useState("");
  const [total, setTotal] = useState("");
  const [delivery, setDelivery] = useState("");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").insert({
        representative_id: rep.id,
        type: "order",
        title: `Pedido — ${client}`,
        description: products,
        outcome: total ? `R$ ${Number(total).toLocaleString("pt-BR")}` : null,
        location: delivery || null,
        status: "pending",
        scheduled_at: delivery ? `${delivery}T00:00:00` : new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido registrado e enviado ao gestor");
      qc.invalidateQueries({ queryKey: ["rep_activities_today"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 pt-3">
      <Field label="Cliente *"><Input placeholder="Nome do cliente / fazenda" value={client} onChange={(e) => setClient(e.target.value)} /></Field>
      <Field label="Produtos / quantidades *"><Textarea rows={2} placeholder="Ex: 60 sc Tecnobov Pasto HD" value={products} onChange={(e) => setProducts(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Valor total (R$)"><Input type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} /></Field>
        <Field label="Entrega"><Input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} /></Field>
      </div>
      <Field label="Observações"><Textarea placeholder="Detalhes adicionais..." rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <DialogFooter className="gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1 bg-slate-700 hover:bg-slate-800" onClick={() => save.mutate()} disabled={!client || !products || save.isPending}>
          {save.isPending ? "Enviando..." : "Enviar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
