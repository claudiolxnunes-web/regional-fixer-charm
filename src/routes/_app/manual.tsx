import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpen, LayoutDashboard, Smartphone, Route as RouteIcon, ClipboardList,
  Users, Building2, TrendingUp, ShoppingCart, Briefcase, FileCheck, Target, Activity,
  BarChart3, Bot, Brain, Sparkles, LineChart, Map, Bell, Settings, Upload, Zap,
  Package, HeartPulse, Stethoscope, CreditCard, Mic, FileText, CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/_app/manual")({ component: Manual });

type Item = {
  to: string;
  title: string;
  icon: any;
  desc: string;
  how: string[];
};

type Section = {
  wave: string;
  title: string;
  subtitle: string;
  items: Item[];
};

const sections: Section[] = [
  {
    wave: "Onda 1",
    title: "Núcleo Comercial",
    subtitle: "Cadastros, vendas e gestão diária da operação.",
    items: [
      { to: "/dashboard", title: "Dashboard", icon: LayoutDashboard, desc: "Visão geral de faturamento, metas e desempenho.",
        how: ["Abra para ver KPIs do mês", "Use os filtros para alternar período", "Cards mostram crescimento vs mês anterior"] },
      { to: "/representantes", title: "Representantes", icon: Users, desc: "Cadastro e desempenho da força de vendas.",
        how: ["Convide um rep pelo botão Convidar", "Clique no nome para abrir o perfil detalhado", "Ranking por receita está na home"] },
      { to: "/clientes", title: "Clientes", icon: Building2, desc: "Base completa de clientes com histórico.",
        how: ["Use a busca para filtrar por nome/UF", "Abra um cliente para ver vendas e atividades", "Botão Briefing IA gera resumo pré-visita"] },
      { to: "/vendas", title: "Vendas", icon: TrendingUp, desc: "Notas fiscais e receita por período.",
        how: ["Filtre por rep, linha, UF ou período", "Exporte para análise externa"] },
      { to: "/pedidos", title: "Pedidos em Aberto", icon: ShoppingCart, desc: "Pedidos pendentes de faturamento.",
        how: ["Acompanhe status e prazos", "Identifique gargalos de faturamento"] },
      { to: "/metas", title: "Metas", icon: Target, desc: "Metas por rep, linha e período.",
        how: ["Importe metas via planilha", "Acompanhe % atingido em tempo real"] },
      { to: "/atividades", title: "Atividades", icon: Activity, desc: "Registro de visitas, ligações e tarefas.",
        how: ["Filtre por rep e tipo", "Use junto com Agenda SMART"] },
    ],
  },
  {
    wave: "Onda 2",
    title: "Operação em Campo & Mapa",
    subtitle: "Ferramentas do representante e visão geográfica.",
    items: [
      { to: "/mapa", title: "Mapa Geográfico", icon: Map, desc: "Mapa de calor de clientes e vendas por região.",
        how: ["Alterne entre clusters e heatmap", "Filtre por linha ou rep", "Clique nos pontos para detalhes do cliente"] },
      { to: "/planejamento-visitas", title: "Agenda SMART", icon: RouteIcon, desc: "Roteirização inteligente de visitas.",
        how: ["A IA sugere a melhor sequência de visitas", "Considera distância e prioridade do cliente"] },
      { to: "/app-representante", title: "App de Registro (Campo)", icon: Smartphone, desc: "Interface mobile para o rep usar em campo.",
        how: ["Instale como app pelo botão Instalar", "Funciona offline — sincroniza ao reconectar"] },
    ],
  },
  {
    wave: "Onda 3",
    title: "Offline, PWA & WhatsApp",
    subtitle: "Continuidade fora de cobertura e integração com WhatsApp.",
    items: [
      { to: "/registro-campo", title: "Registro de Campo", icon: ClipboardList, desc: "Registre visitas e oportunidades mesmo sem internet.",
        how: ["Os registros ficam em fila local quando offline", "O indicador no topo mostra status de conexão", "Sincroniza automaticamente ao voltar online"] },
      { to: "/oportunidades", title: "Oportunidades", icon: Briefcase, desc: "Pipeline de oportunidades comerciais.",
        how: ["Crie a partir de uma visita ou WhatsApp", "Acompanhe estágios até fechamento"] },
      { to: "/propostas", title: "Propostas", icon: FileCheck, desc: "Cotações e propostas formais.",
        how: ["Gere PDF e envie ao cliente", "Status muda conforme aceite/recusa"] },
    ],
  },
  {
    wave: "Onda 4",
    title: "Inteligência Avançada",
    subtitle: "Previsão, benchmark e narrativa executiva.",
    items: [
      { to: "/inteligencia", title: "Inteligência Avançada", icon: Sparkles, desc: "Forecast de receita, benchmark de reps e Resumo da Manhã.",
        how: ["Aba Resumo da Manhã: gera narrativa executiva com vitória, risco e ação do dia", "Aba Previsão: projeta próximos 3 meses por regressão linear", "Aba Benchmark: ranking dos últimos 90 dias com gap-to-top"] },
      { to: "/ia-insights", title: "IA Insights", icon: Brain, desc: "Insights proativos sobre clientes e tendências.",
        how: ["Gere insights sob demanda", "Cada insight aponta ação recomendada"] },
      { to: "/analytics", title: "Analytics", icon: LineChart, desc: "Cohorts, curva ABC e análises profundas.",
        how: ["Use para apresentações executivas", "Filtros avançados por dimensão"] },
      { to: "/relatorios", title: "Relatórios", icon: BarChart3, desc: "Relatórios prontos para export.",
        how: ["Selecione período e dimensão", "Baixe em CSV/Excel"] },
    ],
  },
  {
    wave: "Onda 5",
    title: "Copiloto Conversacional",
    subtitle: "Pergunte qualquer coisa sobre o negócio em linguagem natural.",
    items: [
      { to: "/copilot", title: "Copiloto Comercial", icon: Bot, desc: "Chat com IA que enxerga seus dados dos últimos 90 dias.",
        how: ["Use as sugestões prontas ou digite sua pergunta", "Ex: 'qual rep cresceu mais este mês?'", "Ex: 'quais clientes A estão sumidos?'", "Enter envia, Shift+Enter quebra linha"] },
    ],
  },
  {
    wave: "Suporte",
    title: "Configuração & Operações",
    subtitle: "Importação, alertas, automações e preferências.",
    items: [
      { to: "/alertas", title: "Alertas", icon: Bell, desc: "Alertas automáticos de comportamento dos clientes.",
        how: ["Configure regras em /alertas/config", "Severidade: alta, média, baixa"] },
      { to: "/importacao", title: "Importar Dados", icon: Upload, desc: "Importe vendas, clientes e metas via planilha.",
        how: ["Baixe o template", "Faça upload e confira o pré-visualização"] },
      { to: "/automacoes", title: "Automações", icon: Zap, desc: "Webhooks, digest diário e disparos.",
        how: ["Ative o digest diário por email", "Configure webhooks externos"] },
      { to: "/preferencias", title: "Preferências", icon: Settings, desc: "Configurações da conta e da equipe.",
        how: ["Ajuste fuso, notificações e integrações"] },
    ],
  },
];

function Manual() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BookOpen className="size-6 text-primary" /> Manual & Tutorial
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tudo que o sistema faz, organizado por onda de implementação. Clique em qualquer item para abrir a tela correspondente.
        </p>
      </div>

      {sections.map((section) => (
        <Card key={section.wave}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{section.wave}</Badge>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">{section.subtitle}</p>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <AccordionItem key={item.to} value={item.to}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <Icon className="size-4 text-primary shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-7 space-y-3">
                        <ul className="list-disc pl-4 text-sm space-y-1 text-muted-foreground">
                          {item.how.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                        <Link
                          to={item.to}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Abrir {item.title} →
                        </Link>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-5 text-sm">
          <div className="font-medium mb-1">Dica</div>
          <p className="text-muted-foreground">
            Para publicar as atualizações e disponibilizar para sua equipe, clique em <strong>Publicar</strong> no canto superior direito.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
