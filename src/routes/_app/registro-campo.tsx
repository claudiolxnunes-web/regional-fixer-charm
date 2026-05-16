import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_app/registro-campo")({ component: RegistroCampo });

function RegistroCampo() {
  const { data: list } = useQuery({
    queryKey: ["daily-reports"],
    queryFn: async () => (await supabase.from("daily_reports").select("*").order("report_date", { ascending: false }).limit(30)).data ?? [],
  });

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
                <div className="font-semibold text-primary">
                  {new Date(r.report_date).toLocaleDateString("pt-BR", { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
                <div className="flex gap-2 flex-wrap">
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
}
