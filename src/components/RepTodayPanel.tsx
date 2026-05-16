import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import { MapPin, Target, AlertTriangle, ChevronRight, Calendar, FileText } from "lucide-react";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/**
 * Painel "Hoje" — orientação rápida no app do rep.
 * 4 blocos enxutos: visitas do dia, meta do mês, alertas urgentes, atalho SPIN.
 */
export function RepTodayPanel({ repId }: { repId: string }) {
  const today = new Date();
  const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(today); dayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const expectedPace = today.getDate() / dim;

  const { data: visits } = useQuery({
    queryKey: ["rep_today_visits", repId, dayStart.toISOString()],
    queryFn: async () => (await supabase.from("activities")
      .select("id, title, scheduled_at, status, clients(name, city, state, lat, lng, address)")
      .eq("representative_id", repId).eq("type", "visit")
      .gte("scheduled_at", dayStart.toISOString()).lte("scheduled_at", dayEnd.toISOString())
      .order("scheduled_at").limit(5)).data ?? [],
  });

  const { data: goal } = useQuery({
    queryKey: ["rep_today_goal", repId, monthStart],
    queryFn: async () => {
      const y = today.getFullYear(), m = today.getMonth() + 1;
      const [tRes, sRes] = await Promise.all([
        supabase.from("goal_targets").select("revenue_target").eq("representative_id", repId).eq("year", y).eq("month", m),
        supabase.from("sales_secure_view").select("revenue").eq("representative_id", repId).gte("invoice_date", monthStart),
      ]);
      const target = (tRes.data ?? []).reduce((s, x) => s + Number(x.revenue_target || 0), 0);
      const achieved = (sRes.data ?? []).reduce((s, x) => s + Number(x.revenue || 0), 0);
      return { target, achieved, pct: target ? achieved / target : 0 };
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["rep_today_alerts", repId],
    queryFn: async () => (await supabase.from("alerts")
      .select("id, title, severity, type, client_name")
      .eq("representative_id", repId).is("resolved_at", null)
      .order("severity", { ascending: false }).limit(3)).data ?? [],
  });

  const goalPct = goal?.pct ?? 0;
  const goalTone =
    goalPct >= expectedPace ? "text-emerald-600" :
    goalPct >= expectedPace * 0.7 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="space-y-3">
      {/* Hoje — visitas */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Calendar className="size-3.5" /> Hoje
          </h3>
          <Link to="/planejamento-visitas" className="text-[11px] text-primary hover:underline">Ver semana →</Link>
        </div>
        {(!visits || visits.length === 0) && <p className="text-xs text-muted-foreground py-2">Nenhuma visita agendada para hoje.</p>}
        <div className="space-y-1.5">
          {(visits ?? []).map((v: any, i) => {
            const c = v.clients;
            const mapsHref = c?.lat && c?.lng
              ? `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`
              : c?.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.address} ${c.city ?? ""}`)}` : null;
            return (
              <div key={v.id} className="flex items-center gap-2 text-xs border rounded-md p-2">
                <span className="size-5 rounded-full bg-primary/10 text-primary grid place-items-center text-[10px] font-semibold shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c?.name ?? v.title}</div>
                  {c?.city && <div className="text-muted-foreground truncate flex items-center gap-1"><MapPin className="size-3" />{c.city}/{c.state}</div>}
                </div>
                {mapsHref && (
                  <a href={mapsHref} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline whitespace-nowrap">Como chegar</a>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Meta do mês */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Target className="size-3.5" /> Meta do mês
          </h3>
          <span className={`text-xs font-semibold ${goalTone}`}>{Math.round(goalPct * 100)}%</span>
        </div>
        <Progress value={Math.min(goalPct * 100, 100)} className="h-2" />
        <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
          <span>{brl(goal?.achieved ?? 0)} / {brl(goal?.target ?? 0)}</span>
          <span>Ritmo esperado: {Math.round(expectedPace * 100)}%</span>
        </div>
      </Card>

      {/* Alertas urgentes */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="size-3.5" /> Alertas urgentes
          </h3>
          <Link to="/alertas" className="text-[11px] text-primary hover:underline">Ver todos →</Link>
        </div>
        {(!alerts || alerts.length === 0) && <p className="text-xs text-muted-foreground py-2">Nenhum alerta pendente. 🎉</p>}
        <div className="space-y-1.5">
          {(alerts ?? []).map((a: any) => (
            <div key={a.id} className="flex items-center gap-2 text-xs">
              <Badge
                variant="outline"
                className={a.severity === "high" ? "bg-rose-50 text-rose-700 border-rose-300" : "bg-amber-50 text-amber-700 border-amber-300"}
              >
                {a.severity === "high" ? "Alta" : "Média"}
              </Badge>
              <div className="flex-1 min-w-0 truncate">
                <span className="font-medium">{a.client_name ?? "—"}</span>
                <span className="text-muted-foreground"> · {a.title}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Atalho SPIN */}
      <Link
        to="/planejamento-visitas"
        className="flex items-center justify-between gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-3 hover:opacity-90 transition"
      >
        <div className="flex items-center gap-2">
          <FileText className="size-4" />
          <span className="font-semibold text-sm">Registrar visita (SPIN)</span>
        </div>
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
