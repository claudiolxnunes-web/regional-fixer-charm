import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, CheckCircle2, AlertCircle, Database, Zap, ShieldCheck, Server, RefreshCw, Bell,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { systemHealth } from "@/lib/health.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/status")({ component: StatusPage });

function StatusPage() {
  const health = useServerFn(systemHealth);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["system_health"],
    queryFn: () => health(),
    refetchInterval: 60_000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ["recent_system_alerts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("title, message, severity, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const s = data?.services;
  const services = [
    { name: "Banco de Dados", icon: Database, check: s?.db,
      detail: s?.db?.ok ? `${s.db.latency_ms}ms latência` : (s?.db?.detail ?? "Indisponível") },
    { name: "Autenticação", icon: ShieldCheck, check: s?.auth,
      detail: s?.auth?.ok ? "Sessão validada" : "Falha" },
    { name: "IA (Lovable Gateway)", icon: Zap, check: s?.ai,
      detail: s?.ai?.ok ? `${s.ai.latency_ms}ms` : (s?.ai?.detail ?? "Indisponível") },
    { name: "Servidor SSR (Edge)", icon: Server,
      check: { ok: true, latency_ms: 0 }, detail: "Em execução" },
    { name: "Stripe (Pagamentos)", icon: RefreshCw, check: s?.stripe,
      detail: s?.stripe?.detail ?? "—" },
    { name: "E-mail (Resend)", icon: Bell, check: s?.email,
      detail: s?.email?.detail ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Status do Sistema</h1>
          <p className="text-muted-foreground">
            Saúde verificada em tempo real{data?.checked_at && ` — ${new Date(data.checked_at).toLocaleTimeString("pt-BR")}`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 text-sm px-3 h-9 rounded-md border bg-background hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((sv) => (
          <Card key={sv.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{sv.name}</CardTitle>
              <sv.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <StatusBadge loading={isLoading} ok={sv.check?.ok} />
                <span className="text-xs text-muted-foreground">{sv.detail}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Alertas recentes
            </CardTitle>
            <CardDescription>Últimos 5 alertas gerados pelo sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(alertsData ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum alerta recente.</p>
            )}
            {(alertsData ?? []).map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                <SeverityIcon sev={a.severity} />
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{a.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {a.message && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{a.message}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Segurança & Compliance
            </CardTitle>
            <CardDescription>Políticas de proteção de dados (LGPD).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <Row label="Criptografia em trânsito" value="TLS 1.3" />
              <Row label="Row-Level Security (RLS)" value="Ativo" />
              <Row label="Autenticação por sessão" value="Ativo" />
              <Row label="Isolamento por equipe" value="Ativo" />
            </div>
            <p className="text-[11px] text-muted-foreground italic pt-4 border-t">
              Infraestrutura Lovable Cloud. Dados isolados por equipe via políticas RLS.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ loading, ok }: { loading: boolean; ok?: boolean }) {
  if (loading || ok === undefined)
    return <Badge variant="outline" className="animate-pulse">Verificando…</Badge>;
  if (ok)
    return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Operacional</Badge>;
  return <Badge variant="destructive">Degradado</Badge>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">{value}</Badge>
    </div>
  );
}

function SeverityIcon({ sev }: { sev: string }) {
  if (sev === "high") return <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />;
  if (sev === "medium") return <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />;
}
