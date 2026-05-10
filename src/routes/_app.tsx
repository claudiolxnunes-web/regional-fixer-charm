import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      // Look up current user's team membership + team status
      const { data: tm } = await supabase
        .from("team_members")
        .select("role, team_id, teams!inner(subscription_status, current_period_end)")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Reps and members of any team pass through (access governed by team status of their admin)
      // Admins without active sub get redirected to /planos
      if (tm?.role === "admin") {
        const team = (tm as any).teams;
        const active = team?.subscription_status === "active" &&
          (!team.current_period_end || new Date(team.current_period_end) > new Date());
        if (!active) {
          navigate({ to: "/planos" });
          return;
        }
      } else if (!tm) {
        // No team yet => brand new gestor signup => send to planos
        navigate({ to: "/planos" });
        return;
      } else {
        // Rep: check that their team is active; if not, block
        const team = (tm as any).teams;
        const active = team?.subscription_status === "active" &&
          (!team.current_period_end || new Date(team.current_period_end) > new Date());
        if (!active) {
          navigate({ to: "/login" });
          return;
        }
      }
      setChecking(false);
    })();
  }, [loading, session, navigate]);

  if (loading || checking) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if (!session) return null;

  return <DashboardLayout><Outlet /></DashboardLayout>;
}
