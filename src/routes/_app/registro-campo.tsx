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
import { ClipboardCheck, Target, MessageSquare } from "lucide-react";

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
        .select("id, title, clients(name)")
        .eq("status", "pending")
        .eq("type", "visit")
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registro de Atividades</h1>
        <p className="text-sm text-muted-foreground">Histórico e contagem diária das atividades realizadas em campo.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Histórico de Reportes (últimos 30 dias)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(list ?? []).map((r) => (
            <div key={r.id} className="border rounded-md p-3 text-sm bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-primary">{new Date(r.report_date).toLocaleDateString("pt-BR", { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Visitas: {r.visits_count}</Badge>
                  <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">Ligações: {r.calls_count}</Badge>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Propostas: {r.proposals_count}</Badge>
                  <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200">Pedidos: {r.orders_count}</Badge>
                </div>
              </div>
              {r.observations && (
                <div className="bg-muted/30 p-2 rounded mt-2 border-l-2 border-primary/20">
                  <p className="text-xs text-muted-foreground italic">"{r.observations}"</p>
                </div>
              )}
            </div>
          ))}
          {(!list || list.length === 0) && (
            <div className="text-center py-12">
              <ClipboardCheck className="size-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

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
