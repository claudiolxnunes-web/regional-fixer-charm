import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Building2, Target, Briefcase, Activity,
  Map, BarChart3, Bell, Settings, Upload, Brain, LogOut, Sprout,
  TrendingUp, LineChart, Smartphone, ClipboardList, Zap,
} from "lucide-react";
import type { ReactNode } from "react";

const groups = [
  {
    label: "Principal",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Gestão Comercial",
    items: [
      { to: "/representantes", label: "Representantes", icon: Users },
      { to: "/clientes", label: "Clientes", icon: Building2 },
      { to: "/vendas", label: "Vendas", icon: TrendingUp },
      { to: "/oportunidades", label: "Oportunidades", icon: Briefcase },
      { to: "/metas", label: "Metas", icon: Target },
      { to: "/atividades", label: "Atividades", icon: Activity },
    ],
  },
  {
    label: "Análise & IA",
    items: [
      { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/ia-insights", label: "IA Insights", icon: Brain },
      { to: "/analytics", label: "Analytics", icon: LineChart },
      { to: "/mapa", label: "Mapa Geográfico", icon: Map },
    ],
  },
  {
    label: "Operações",
    items: [
      { to: "/app-representante", label: "App Representante", icon: Smartphone },
      { to: "/registro-campo", label: "Registro de Campo", icon: ClipboardList },
      { to: "/alertas", label: "Alertas", icon: Bell },
      { to: "/preferencias", label: "Preferências", icon: Settings },
      { to: "/importacao", label: "Importar Dados", icon: Upload },
      { to: "/automacoes", label: "Automações", icon: Zap },
    ],
  },
] as const;

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-5 py-4 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="size-9 rounded-lg bg-sidebar-primary grid place-items-center shrink-0">
            <Sprout className="size-5 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold leading-none truncate">AgroGestão</div>
            <div className="text-[11px] text-sidebar-foreground/60 mt-1">CRM Regional</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="px-5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </div>
              {group.items.map(({ to, label, icon: Icon }) => {
                const active = loc.pathname === to || (to === "/dashboard" && loc.pathname === "/");
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-3 px-5 py-2 text-sm transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
                        : "hover:bg-sidebar-accent/50 border-l-2 border-transparent"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border flex items-center gap-2.5">
          <div className="size-9 rounded-full bg-sidebar-primary/20 text-sidebar-primary grid place-items-center font-semibold text-sm shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.user_metadata?.name || user?.email?.split("@")[0]}</div>
            <div className="text-[10px] text-sidebar-foreground/60 truncate">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            title="Sair"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="px-8 py-6 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
