import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Building2, Target, Briefcase, Activity,
  Map, BarChart3, Bell, Settings, Upload, Brain, LogOut, Sprout,
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/representantes", label: "Representantes", icon: Users },
  { to: "/oportunidades", label: "Oportunidades", icon: Briefcase },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/atividades", label: "Atividades", icon: Activity },
  { to: "/mapa", label: "Mapa", icon: Map },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/ia-insights", label: "IA Insights", icon: Brain },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/importacao", label: "Importação", icon: Upload },
  { to: "/preferencias", label: "Preferências", icon: Settings },
] as const;

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-6 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="size-9 rounded-lg bg-sidebar-primary grid place-items-center">
            <Sprout className="size-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold leading-none">AgroGestão</div>
            <div className="text-xs text-sidebar-foreground/60 mt-0.5">CRM Regional</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to || (to === "/dashboard" && loc.pathname === "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
                    : "hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs truncate mb-2 text-sidebar-foreground/70">{user?.email}</div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          >
            <LogOut className="size-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="px-8 py-6 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
