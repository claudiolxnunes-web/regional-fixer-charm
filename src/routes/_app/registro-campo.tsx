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

export const Route = createFileRoute("/_app/registro-campo")({ component: RegistroCampo });

function RegistroCampo() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ report_date: today, visits_count: "0", calls_count: "0", proposals_count: "0", orders_count: "0", observations: "" });

  const { data: list } = useQuery({
    queryKey: ["daily-reports"],
    queryFn: async () => (await supabase.from("daily_reports").select("*").order("report_date", { ascending: false }).limit(30)).data ?? [],
  });

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Não autenticado");
    const { error } = await supabase.from("daily_reports").insert({
      rep_user_id: user.id,
      report_date: form.report_date,
      visits_count: Number(form.visits_count || 0),
      calls_count: Number(form.calls_count || 0),
      proposals_count: Number(form.proposals_count || 0),
      orders_count: Number(form.orders_count || 0),
      observations: form.observations || null,
      submitted_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Registro salvo");
    qc.invalidateQueries({ queryKey: ["daily-reports"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registro de Campo</h1>
        <p className="text-sm text-muted-foreground">Reporte diário das atividades do representante.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Novo registro</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div><Label>Data</Label><Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} /></div>
            <div><Label>Visitas</Label><Input type="number" value={form.visits_count} onChange={(e) => setForm({ ...form, visits_count: e.target.value })} /></div>
            <div><Label>Ligações</Label><Input type="number" value={form.calls_count} onChange={(e) => setForm({ ...form, calls_count: e.target.value })} /></div>
            <div><Label>Propostas</Label><Input type="number" value={form.proposals_count} onChange={(e) => setForm({ ...form, proposals_count: e.target.value })} /></div>
            <div><Label>Pedidos</Label><Input type="number" value={form.orders_count} onChange={(e) => setForm({ ...form, orders_count: e.target.value })} /></div>
          </div>
          <div><Label>Observações</Label><Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="Resumo do dia, ocorrências, próximos passos..." /></div>
          <Button onClick={save}>Salvar registro</Button>
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
