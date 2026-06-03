import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, MapPin, Phone, Mail, Target, Users, AlertTriangle,
  Route as RouteIcon, FileText, Activity, TrendingDown,
} from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_app/representantes/$id")({ component: RepDetailPage });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const PAGE_SIZE = 1000;

async function fetchRepMonthlyGoalTargets(representativeId: string, year: number, month: number) {
  const all: { revenue_target: number | null; volume_target: number | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("goal_targets")
      .select("revenue_target, volume_target")
      .eq("representative_id", representativeId)
      .eq("year", year)
      .eq("month", month)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
}

function RepDetailPage() {
  const { id } = Route.useParams();

  const { data: rep, isLoading } = useQuery({
    queryKey: ["rep-detail", id],
    queryFn: async () => (await supabase.from("representatives").select("*").eq("id", id).maybeSingle()).data,
  });

  const repCode = rep?.rep_code ?? null;
  const repUserId = rep?.user_id ?? null;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const weekStart = useMemo(() => {
    const d = new Date(); const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  // 1. Roteiro & visitas
  const { data: visits } = useQuery({
    enabled: !!id,
    queryKey: ["rep-visits", id],
    queryFn: async () => (await supabase.from("activities").select("id, status, scheduled_at, completed_at")
      .eq("representative_id", id).eq("type", "visit").gte("scheduled_at", weekStart)).data ?? [],
  });

  // 2. SPIN
  const { data: spinCounts } = useQuery({
    enabled: !!id,
    queryKey: ["rep-spin", id],
    queryFn: async () => {
      const { data } = await supabase.from("spin_notes")
        .select("situation, problem, implication, need_payoff, created_at")
        .eq("representative_id", id).gte("created_at", monthStart);
      const arr = data ?? [];
      const complete = arr.filter((s) => s.situation && s.problem && s.implication && s.need_payoff).length;
      return { total: arr.length, complete };
    },
  });

  // 3. Pipeline
  const { data: pipeline } = useQuery({
    enabled: !!id,
    queryKey: ["rep-pipe", id],
    queryFn: async () => {
      const { data } = await supabase.from("opportunities").select("stage, value").eq("representative_id", id);
      const open = (data ?? []).filter((o) => !["won", "lost"].includes(o.stage as string));
      const total = open.reduce((s, o) => s + Number(o.value || 0), 0);
      return { count: open.length, total, byStage: open };
    },
  });

  // 3b. Propostas abertas
  const { data: quotes } = useQuery({
    enabled: !!repUserId,
    queryKey: ["rep-quotes", repUserId],
    queryFn: async () => (await supabase.from("quotes").select("id, status, total")
      .eq("rep_user_id", repUserId!).eq("status", "pending")).data ?? [],
  });

  // 4. Metas
  const { data: goals } = useQuery({
    enabled: !!id,
    queryKey: ["rep-goals", id],
    queryFn: async () => {
      const y = now.getFullYear(), m = now.getMonth() + 1;
      const targets = await fetchRepMonthlyGoalTargets(id, y, m);
      const tRev = targets.reduce((s, t) => s + Number(t.revenue_target || 0), 0);
      const tVol = targets.reduce((s, t) => s + Number(t.volume_target || 0), 0);
      const { data: sales } = await supabase.from("sales").select("revenue, volume_sales")
        .eq("representative_id", id).gte("invoice_date", monthStart);
      const aRev = (sales ?? []).reduce((s, x) => s + Number(x.revenue || 0), 0);
      const aVol = (sales ?? []).reduce((s, x) => s + Number(x.volume_sales || 0), 0);
      return { tRev, tVol, aRev, aVol };
    },
  });

  // 5. Carteira
  const { data: portfolio } = useQuery({
    enabled: !!id,
    queryKey: ["rep-portfolio", id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("status, last_purchase_date").eq("representative_id", id);
      const arr = data ?? [];
      const today = new Date();
      const monthsSince = (d: string | null) => d ? (today.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 30.4) : 99;
      return {
        active: arr.filter((c) => c.status === "active").length,
        atRisk: arr.filter((c) => c.status === "active" && monthsSince(c.last_purchase_date) >= 3 && monthsSince(c.last_purchase_date) < 6).length,
        inactive: arr.filter((c) => c.status === "inactive" || monthsSince(c.last_purchase_date) >= 6).length,
        total: arr.length,
      };
    },
  });

  // 6. Atividades 30d
  const { data: activitiesCount } = useQuery({
    enabled: !!id,
    queryKey: ["rep-act-30", id],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data } = await supabase.from("activities").select("type")
        .eq("representative_id", id).gte("created_at", since.toISOString());
      const arr = data ?? [];
      return {
        total: arr.length,
        visit: arr.filter((a) => a.type === "visit").length,
        call: arr.filter((a) => a.type === "call").length,
        other: arr.filter((a) => !["visit", "call"].includes(a.type)).length,
      };
    },
  });

  // 7. Alertas pendentes
  const { data: alerts } = useQuery({
    enabled: !!id,
    queryKey: ["rep-alerts", id],
    queryFn: async () => (await supabase.from("alerts").select("severity, type")
      .eq("representative_id", id).is("resolved_at", null)).data ?? [],
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!rep) return <div className="p-8 text-center text-muted-foreground">Representante não encontrado.</div>;

  const visitsPlanned = visits?.length ?? 0;
  const visitsDone = (visits ?? []).filter((v) => v.status === "completed").length;
  const visitRate = visitsPlanned ? visitsDone / visitsPlanned : 0;
  const spinRate = spinCounts?.total ? spinCounts.complete / spinCounts.total : 0;
  const revPct = goals?.tRev ? (goals.aRev / goals.tRev) : 0;
  const volPct = goals?.tVol ? (goals.aVol / goals.tVol) : 0;
  const alertsHigh = (alerts ?? []).filter((a) => a.severity === "high").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/representantes" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="size-3" /> Representantes
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{rep.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap mt-1">
            {rep.rep_code && <span className="font-mono">{rep.rep_code}</span>}
            {rep.home_city && <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{rep.home_city}/{rep.home_state}</span>}
            {rep.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" />{rep.phone}</span>}
            {rep.email && <span className="inline-flex items-center gap-1"><Mail className="size-3" />{rep.email}</span>}
            <Badge variant={rep.status === "active" ? "default" : "secondary"}>{rep.status}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Roteiro */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><RouteIcon className="size-4 text-primary" /> Roteiro da semana</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">{visitsDone} <span className="text-base text-muted-foreground font-normal">/ {visitsPlanned} visitas</span></div>
            <Progress value={visitRate * 100} />
            <p className="text-xs text-muted-foreground">{pct(visitRate)} de cumprimento</p>
          </CardContent>
        </Card>

        {/* 2. SPIN */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="size-4 text-primary" /> SPIN preenchido (mês)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">{spinCounts?.complete ?? 0} <span className="text-base text-muted-foreground font-normal">/ {spinCounts?.total ?? 0} visitas</span></div>
            <Progress value={spinRate * 100} />
            <p className="text-xs text-muted-foreground">{pct(spinRate)} com S+P+I+N completos</p>
          </CardContent>
        </Card>

        {/* 3. Pipeline */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="size-4 text-primary" /> Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">{brl(pipeline?.total ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{pipeline?.count ?? 0} oportunidades abertas · {quotes?.length ?? 0} propostas pendentes</p>
          </CardContent>
        </Card>

        {/* 4. Metas */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="size-4 text-primary" /> Metas do mês</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Faturamento</span>
                <span className="text-xs font-medium">{pct(revPct)}</span>
              </div>
              <Progress value={Math.min(revPct * 100, 100)} />
              <p className="text-xs text-muted-foreground">{brl(goals?.aRev ?? 0)} / {brl(goals?.tRev ?? 0)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">Volume</span>
                <span className="text-xs font-medium">{pct(volPct)}</span>
              </div>
              <Progress value={Math.min(volPct * 100, 100)} />
              <p className="text-xs text-muted-foreground">{Math.round(goals?.aVol ?? 0).toLocaleString("pt-BR")} / {Math.round(goals?.tVol ?? 0).toLocaleString("pt-BR")} sc</p>
            </div>
          </CardContent>
        </Card>

        {/* 7. Alertas */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="size-4 text-amber-500" /> Alertas pendentes</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{alerts?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">{alertsHigh} de severidade alta</p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/alertas">Ver alertas</Link>
            </Button>
          </CardContent>
        </Card>

        {/* 5. Carteira */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="size-4 text-primary" /> Carteira</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-2xl font-semibold text-emerald-600">{portfolio?.active ?? 0}</div><p className="text-xs text-muted-foreground">Ativos</p></div>
            <div><div className="text-2xl font-semibold text-amber-600">{portfolio?.atRisk ?? 0}</div><p className="text-xs text-muted-foreground">Em risco (3-5m)</p></div>
            <div><div className="text-2xl font-semibold text-rose-600">{portfolio?.inactive ?? 0}</div><p className="text-xs text-muted-foreground">Inativos (6m+)</p></div>
          </CardContent>
        </Card>

        {/* 6. Atividades */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="size-4 text-primary" /> Atividades (30d)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{activitiesCount?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {activitiesCount?.visit ?? 0} visitas · {activitiesCount?.call ?? 0} ligações · {activitiesCount?.other ?? 0} outras
            </p>
          </CardContent>
        </Card>
      </div>

      {(portfolio?.atRisk ?? 0) > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <TrendingDown className="size-5 text-amber-600" />
            <div className="text-sm">
              <span className="font-medium">{portfolio?.atRisk}</span> clientes deste rep estão entre 3 e 5 meses sem comprar — risco de inativação.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
