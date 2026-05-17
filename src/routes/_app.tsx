import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_app")({ component: AppLayout });

const GRACE_DAYS = 7;
const RENEWAL_WARN_DAYS = [14, 7, 1];

function evaluateAccess(team: { subscription_status: string; current_period_end: string | null; plan: string } | null) {
  if (!team) return { ok: false, banner: null as null | { tone: "warn" | "danger"; msg: string } };
  const end = team.current_period_end ? new Date(team.current_period_end) : null;
  const now = new Date();
  const daysLeft = end ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : null;

  // Active or trialing → allow; warn near expiry for one-time plans
  if (team.subscription_status === "active" || team.subscription_status === "trialing") {
    if (end && daysLeft !== null && daysLeft <= Math.max(...RENEWAL_WARN_DAYS) && daysLeft > 0) {
      const oneTime = team.plan === "semestral" || team.plan === "anual";
      if (oneTime && RENEWAL_WARN_DAYS.some((d) => daysLeft <= d)) {
        return { ok: true, banner: { tone: "warn" as const, msg: `Sua assinatura ${team.plan} vence em ${daysLeft} dia(s). Renove em /planos para não perder o acesso.` } };
      }
    }
    if (end && daysLeft !== null && daysLeft <= 0) return { ok: false, banner: null };
    return { ok: true, banner: null };
  }
  // past_due → grace period
  if (team.subscription_status === "past_due") {
    const updatedRef = end ? end.getTime() : now.getTime();
    const graceEnd = updatedRef + GRACE_DAYS * 86400000;
    if (now.getTime() < graceEnd) {
      const left = Math.ceil((graceEnd - now.getTime()) / 86400000);
      return { ok: true, banner: { tone: "danger" as const, msg: `Falha no pagamento. Atualize seu cartão em "Gerenciar assinatura". Acesso será bloqueado em ${left} dia(s).` } };
    }
    return { ok: false, banner: null };
  }
  return { ok: false, banner: null };
}

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [banner, setBanner] = useState<{ tone: "warn" | "danger"; msg: string } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/login" }); return; }
    (async () => {
      const { data: tm } = await supabase
        .from("team_members")
        .select("role, team_id, teams!inner(subscription_status, current_period_end, plan)")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!tm) { navigate({ to: "/planos" }); return; }
      const team = (tm as any).teams;
      const { ok, banner: b } = evaluateAccess(team);
      if (!ok) {
        navigate({ to: tm.role === "admin" ? "/planos" : "/login" });
        return;
      }
      setBanner(b);
      setChecking(false);
    })();
  }, [loading, session, navigate]);

  if (loading || checking) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if (!session) return null;

  return (
    <DashboardLayout>
      {banner && (
        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 mb-3 text-sm ${banner.tone === "danger" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-amber-400/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}`}>
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{banner.msg}</span>
        </div>
      )}
      <RouteErrorBoundary><Outlet /></RouteErrorBoundary>
    </DashboardLayout>
  );
}
