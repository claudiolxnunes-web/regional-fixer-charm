import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, Building2, Target, Briefcase, Activity,
  Map, BarChart3, Bell, Settings, Upload, Brain, LogOut, Sprout,
  TrendingUp, LineChart, Smartphone, ClipboardList, Zap, ShoppingCart, FileCheck,
  Menu, Compass, Route as RouteIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/logo.png";

const groups = [
  {
    label: "Principal",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/planejamento-visitas", label: "Agenda SMART", icon: RouteIcon },
      { to: "/registro-campo", label: "Registro de Campo", icon: ClipboardList },
    ],
  },
  {
    label: "Gestão Comercial",
    items: [
      { to: "/representantes", label: "Representantes", icon: Users },
      { to: "/clientes", label: "Clientes", icon: Building2 },
      { to: "/vendas", label: "Vendas", icon: TrendingUp },
      { to: "/pedidos", label: "Pedidos em Aberto", icon: ShoppingCart },
      { to: "/oportunidades", label: "Oportunidades", icon: Briefcase },
      { to: "/propostas", label: "Propostas", icon: FileCheck },
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
      { to: "/alertas", label: "Alertas", icon: Bell },
      { to: "/preferencias", label: "Preferências", icon: Settings },
      { to: "/importacao", label: "Importar Dados", icon: Upload },
      { to: "/automacoes", label: "Automações", icon: Zap },
    ],
  },
] as const;

function SidebarContent({
  onNavigate,
  user,
  initial,
  onSignOut,
  currentPath,
}: {
  onNavigate?: () => void;
  user: any;
  initial: string;
  onSignOut: () => void;
  currentPath: string;
}) {
  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-4 flex items-center gap-2.5 border-b border-sidebar-border">
        <div className="size-10 rounded-lg bg-white grid place-items-center shrink-0 overflow-hidden">
          <img src={logo} alt="AgroGestão CRM" className="size-9 object-contain" />
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
              const active = currentPath === to || (to === "/dashboard" && currentPath === "/");
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={onNavigate}
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
          onClick={onSignOut}
          title="Sair"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => { await signOut(); navigate({ to: "/login" }); };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0">
        <SidebarContent
          user={user}
          initial={initial}
          onSignOut={handleSignOut}
          currentPath={loc.pathname}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-9 text-sidebar-foreground hover:bg-sidebar-accent">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <SidebarContent
                user={user}
                initial={initial}
                onSignOut={handleSignOut}
                currentPath={loc.pathname}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="size-8 rounded-lg bg-white grid place-items-center shrink-0 overflow-hidden">
            <img src={logo} alt="AgroGestão CRM" className="size-7 object-contain" />
          </div>
          <div className="font-semibold text-sm truncate">AgroGestão</div>
        </header>

        <main className="flex-1 overflow-x-hidden">
          <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6 max-w-[1400px] mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
