import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";
import { VoiceCapture } from "@/components/VoiceCapture";
import { ClientBriefingDialog } from "@/components/ClientBriefingDialog";

export const Route = createFileRoute("/_app/registro-campo")({ component: RegistroCampo });

function RegistroCampo() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ 
    report_date: today, 
    visits_count: "0", 
    calls_count: "0", 
    proposals_count: "0", 
    orders_count: "0", 
    observations: "",
    activity_id: "",
    spin_s: "",
    spin_p: "",
    spin_i: "",
    spin_n: ""
  });

  const { data: activities } = useQuery({
    queryKey: ["pending-visits"],
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, title, client_id, clients(name)")
        .eq("status", "pending")
        .eq("type", "visit")
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

  const selectedActivity = (activities ?? []).find((a: any) => a.id === form.activity_id);
  const selectedClientId: string | undefined = (selectedActivity as any)?.client_id ?? undefined;
  const selectedClientName: string | undefined = (selectedActivity as any)?.clients?.name ?? undefined;

  const { data: list } = useQuery({
    queryKey: ["daily-reports"],
    queryFn: async () => (await supabase.from("daily_reports").select("*").order("report_date", { ascending: false }).limit(30)).data ?? [],
  });

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Não autenticado");
    
    // Save daily report
    const { error: reportError } = await supabase.from("daily_reports").insert({
      rep_user_id: user.id,
      report_date: form.report_date,
      visits_count: Number(form.visits_count || 0),
      calls_count: Number(form.calls_count || 0),
      proposals_count: Number(form.proposals_count || 0),
      orders_count: Number(form.orders_count || 0),
      observations: form.observations || null,
      submitted_at: new Date().toISOString(),
    });

    if (reportError) return toast.error(reportError.message);

    // If activity linked, save SPIN and complete activity
    if (form.activity_id && form.activity_id !== "none") {
      await supabase.from("spin_notes").insert({
        activity_id: form.activity_id,
        rep_user_id: user.id,
        situation: form.spin_s,
        problem: form.spin_p,
        implication: form.spin_i,
        need_payoff: form.spin_n,
      });
      await supabase.from("activities").update({ 
        status: "completed", 
        completed_at: new Date().toISOString() 
      }).eq("id", form.activity_id);
    }

    toast.success("Registro e SPIN salvos com sucesso!");
    setForm({ 
      report_date: today, 
      visits_count: "0", 
      calls_count: "0", 
      proposals_count: "0", 
      orders_count: "0", 
      observations: "",
      activity_id: "",
      spin_s: "",
      spin_p: "",
      spin_i: "",
      spin_n: ""
    });
    qc.invalidateQueries({ queryKey: ["daily-reports"] });
    qc.invalidateQueries({ queryKey: ["pending-visits"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="size-6 text-primary" /> Registro de Campo
          </h1>
          <p className="text-sm text-muted-foreground">Reporte diário das atividades do representante.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Novo registro</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Vincular a uma visita agendada (Opcional)</Label>
              <Select value={form.activity_id} onValueChange={(v) => setForm({ ...form, activity_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma visita para registrar o SPIN" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma visita específica</SelectItem>
                  {activities?.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title} - {a.clients?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.activity_id && form.activity_id !== "none" && selectedClientId && (
              <div className="flex flex-wrap gap-2">
                <ClientBriefingDialog clientId={selectedClientId} clientName={selectedClientName} triggerLabel="Briefing pré-visita (IA)" />
              </div>
            )}

            {form.activity_id && form.activity_id !== "none" && (
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    <ClipboardCheck className="size-4" /> Registro SPIN (Método Consultivo)
                  </div>
                  <VoiceCapture
                    context="visit_spin"
                    label="Ditar visita SPIN"
                    onResult={({ structured }) => {
                      if (!structured) return;
                      setForm((f) => ({
                        ...f,
                        spin_s: structured.spin_s ?? f.spin_s,
                        spin_p: structured.spin_p ?? f.spin_p,
                        spin_i: structured.spin_i ?? f.spin_i,
                        spin_n: structured.spin_n ?? f.spin_n,
                        observations: structured.observations ?? f.observations,
                      }));
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">S - Situação</Label>
                    <Textarea 
                      placeholder="Fatos, dados, contexto..." 
                      className="text-xs h-20"
                      value={form.spin_s}
                      onChange={(e) => setForm({ ...form, spin_s: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">P - Problema</Label>
                    <Textarea 
                      placeholder="Dificuldades, insatisfações..." 
                      className="text-xs h-20"
                      value={form.spin_p}
                      onChange={(e) => setForm({ ...form, spin_p: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">I - Implicação</Label>
                    <Textarea 
                      placeholder="Consequências do problema..." 
                      className="text-xs h-20"
                      value={form.spin_i}
                      onChange={(e) => setForm({ ...form, spin_i: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">N - Necessidade</Label>
                    <Textarea 
                      placeholder="Valor da solução, benefícios..." 
                      className="text-xs h-20"
                      value={form.spin_n}
                      onChange={(e) => setForm({ ...form, spin_n: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div><Label className="text-xs">Data</Label><Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} /></div>
              <div><Label className="text-xs">Visitas</Label><Input type="number" inputMode="numeric" value={form.visits_count} onChange={(e) => setForm({ ...form, visits_count: e.target.value })} /></div>
              <div><Label className="text-xs">Ligações</Label><Input type="number" inputMode="numeric" value={form.calls_count} onChange={(e) => setForm({ ...form, calls_count: e.target.value })} /></div>
              <div><Label className="text-xs">Propostas</Label><Input type="number" inputMode="numeric" value={form.proposals_count} onChange={(e) => setForm({ ...form, proposals_count: e.target.value })} /></div>
              <div><Label className="text-xs">Pedidos</Label><Input type="number" inputMode="numeric" value={form.orders_count} onChange={(e) => setForm({ ...form, orders_count: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Observações Gerais</Label><Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="Resumo do dia..." /></div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button onClick={save} className="w-full sm:w-auto">Enviar Registro Diário</Button>
              <VoiceCapture
                context="daily_report"
                label="Ditar relato do dia"
                onResult={({ structured, transcript }) => {
                  if (!structured) return;
                  setForm((f) => ({
                    ...f,
                    visits_count: structured.visits_count != null ? String(structured.visits_count) : f.visits_count,
                    calls_count: structured.calls_count != null ? String(structured.calls_count) : f.calls_count,
                    proposals_count: structured.proposals_count != null ? String(structured.proposals_count) : f.proposals_count,
                    orders_count: structured.orders_count != null ? String(structured.orders_count) : f.orders_count,
                    observations: structured.observations ?? transcript ?? f.observations,
                  }));
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico (últimos 30 registros)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(list ?? []).map((r) => (
            <div key={r.id} className="border rounded-md p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{new Date(r.report_date).toLocaleDateString("pt-BR")}</div>
                <div className="text-xs text-muted-foreground">
                  V:{r.visits_count} · L:{r.calls_count} · P:{r.proposals_count} · Ped:{r.orders_count}
                </div>
              </div>
              {r.observations && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.observations}</p>}
            </div>
          ))}
          {(!list || list.length === 0) && <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
