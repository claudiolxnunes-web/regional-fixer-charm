import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCircle2, Eye, RefreshCw, AlertTriangle, Clock, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/alertas")({ component: AlertasPage });

const TYPE_LABEL: Record<string, string> = {
  inactive_client: "Cliente inativo",
  consumption_drop: "Queda de consumo",
  low_stock: "Estoque baixo",
  goal_at_risk: "Meta em risco",
  quote_expiring: "Proposta vencendo",
};

const SEV_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

function AlertasPage() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"new" | "read" | "resolved" | "all">("new");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["alerts_list", tab],
    queryFn: async () => {
      let q = supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(500);
      if (tab !== "all") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = {
    new: rows.filter((r: any) => r.status === "new").length,
    high: rows.filter((r: any) => r.severity === "high").length,
    total: rows.length,
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alerts")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts_list"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alerta resolvido");
      qc.invalidateQueries({ queryKey: ["alerts_list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const regen = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/public/hooks/run-alerts", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (d: any) => {
      const c = d.counts || {};
      const total = c.total ?? 0;
      toast.success(
        `${total} novo(s) alerta(s)` +
          (total > 0
            ? ` — inativos: ${c.inactive_client ?? 0}, queda: ${c.consumption_drop ?? 0}, estoque: ${c.low_stock ?? 0}, meta: ${c.goal_at_risk ?? 0}, propostas: ${c.quote_expiring ?? 0}`
            : "")
      );
      qc.invalidateQueries({ queryKey: ["alerts_list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Bell className="size-6" /> Alertas Comerciais
          </h1>
          <p className="text-sm text-muted-foreground">
            Inatividade, queda de consumo, estoque baixo, meta em risco e propostas vencendo. Recorrência mensal.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/alertas/config"><Settings2 className="size-4 mr-1" /> Configurar regras</Link>
          </Button>
          {isStaff && (
            <Button
              variant="outline"
              size="sm"
              disabled={regen.isPending}
              onClick={() => regen.mutate()}
            >
            <RefreshCw className={`size-4 mr-1 ${regen.isPending ? "animate-spin" : ""}`} />
            Recalcular agora
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Kpi icon={<Clock className="size-4" />} label="Novos" value={counts.new} />
        <Kpi icon={<AlertTriangle className="size-4 text-destructive" />} label="Alta severidade" value={counts.high} />
        <Kpi icon={<Bell className="size-4" />} label="Total" value={counts.total} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="new">Novos</TabsTrigger>
          <TabsTrigger value="read">Lidos</TabsTrigger>
          <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Severidade</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Mensagem</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && !rows.length && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum alerta</td></tr>
              )}
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3"><Badge variant="outline">{TYPE_LABEL[r.type] || r.type}</Badge></td>
                  <td className="p-3"><Badge variant={SEV_VARIANT[r.severity] || "outline"}>{r.severity}</Badge></td>
                  <td className="p-3">{r.client_name || r.client_code || "—"}</td>
                  <td className="p-3 max-w-md">{r.message}</td>
                  <td className="p-3"><Badge variant={r.status === "new" ? "default" : "outline"}>{r.status}</Badge></td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {r.status === "new" && (
                        <Button size="sm" variant="ghost" title="Marcar lido" onClick={() => markRead.mutate(r.id)}>
                          <Eye className="size-4" />
                        </Button>
                      )}
                      {r.status !== "resolved" && (
                        <Button size="sm" variant="ghost" title="Resolver" onClick={() => resolve.mutate(r.id)}>
                          <CheckCircle2 className="size-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 bg-muted/30">
        <div className="text-xs text-muted-foreground">
          📅 Geração automática: dia 1º de cada mês às 06:00. Próximas regras: queda de consumo, estoque baixo, meta em risco.
          📧 Notificações por e-mail e WhatsApp serão habilitadas após configurar domínio de e-mail e Twilio.
        </div>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </Card>
  );
}
