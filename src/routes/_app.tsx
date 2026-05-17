import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { AlertTriangle, Terminal } from "lucide-react";

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

const PERMISSION_TIMEOUT_MS = 6000;
const MAX_AUTO_RELOADS = 2;
const RELOAD_STORAGE_KEY = "lvbl-app-permission-reload-count";

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [banner, setBanner] = useState<{ tone: "warn" | "danger"; msg: string } | null>(null);
  const [stalled, setStalled] = useState(false);
  const [showDiagnosticLink, setShowDiagnosticLink] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowDiagnosticLink(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", search: { invite: undefined } });
      return;
    }

    let isMounted = true;
    let resolved = false;

    const finish = () => {
      if (!isMounted || resolved) return;
      resolved = true;
      setChecking(false);
      // Reset reload counter on successful boot
      try { sessionStorage.removeItem(RELOAD_STORAGE_KEY); } catch {}
    };

    (async () => {
      try {
        const { data: tm, error } = await supabase
          .from("team_members")
          .select("role, team_id, teams!inner(subscription_status, current_period_end, plan)")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error("Erro ao verificar acesso:", error);
          finish();
          return;
        }

        if (!tm) {
          navigate({ to: "/planos" });
          return;
        }

        const team = (tm as any).teams;
        const { ok, banner: b } = evaluateAccess(team);

        if (!ok) {
          navigate({ to: tm.role === "admin" ? "/planos" : "/login" });
          return;
        }

        setBanner(b);
        finish();
      } catch (err) {
        console.error("Falha silenciosa na verificação de layout:", err);
        finish();
      }
    })();

    // Hard timeout: if the permission check hangs, attempt an auto-reload.
    const timeout = setTimeout(() => {
      if (!isMounted || resolved) return;

      let count = 0;
      try { count = Number(sessionStorage.getItem(RELOAD_STORAGE_KEY) ?? "0") || 0; } catch {}

      if (count < MAX_AUTO_RELOADS) {
        try { sessionStorage.setItem(RELOAD_STORAGE_KEY, String(count + 1)); } catch {}
        console.warn(`[AppLayout] Permission check timeout — auto-reload attempt ${count + 1}/${MAX_AUTO_RELOADS}`);
        if (typeof window !== "undefined") window.location.reload();
        return;
      }

      // After max retries, stop blocking the UI and show a manual recovery prompt.
      console.error("[AppLayout] Permission check stalled after retries — showing manual recovery.");
      setStalled(true);
      setChecking(false);
    }, PERMISSION_TIMEOUT_MS);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [loading, session, navigate]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Autenticando...</div>;
  if (checking) return <div className="min-h-screen grid place-items-center text-muted-foreground">Iniciando sistema...</div>;
  if (!session) return null;

  return (
    <DashboardLayout>
      {stalled && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 mb-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p>A verificação de permissões demorou mais que o esperado. Algumas informações podem não estar atualizadas.</p>
            <div className="flex gap-4 mt-1">
              <button
                onClick={() => { try { sessionStorage.removeItem(RELOAD_STORAGE_KEY); } catch {} ; window.location.reload(); }}
                className="underline font-medium"
              >
                Tentar novamente
              </button>
              <Link
                to="/diagnostics"
                className="flex items-center gap-1.5 underline font-medium text-destructive/80 hover:text-destructive"
              >
                <Terminal className="h-3.5 w-3.5" />
                Ver Diagnóstico
              </Link>
            </div>
          </div>
        </div>
      )}
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

