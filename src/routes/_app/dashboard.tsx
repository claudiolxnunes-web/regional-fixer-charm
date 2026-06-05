import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Zap, TrendingUp, Target, Users, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Sparkles, Loader2,
  Calendar, ChevronRight, ShoppingBag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrencyCompact } from "@/utils/formatters";
import { generateNarrative, predictChurnRisk, findForgottenOpportunities, benchmarkPeers } from "@/lib/intelligence.functions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app/dashboard")({ component: CommandCenter });

function CommandCenter() {
  const getNarrative = useServerFn(generateNarrative);
  const getChurn = useServerFn(predictChurnRisk);
  const getOpportunities = useServerFn(findForgottenOpportunities);
  const getBenchmark = useServerFn(benchmarkPeers);

  const { data: narrative, isLoading: loadingNarrative } = useQuery({
    queryKey: ["narrative"],
    queryFn: () => getNarrative({}),
  });

  const { data: churnRisks, isLoading: loadingChurn } = useQuery({
    queryKey: ["churn-prediction"],
    queryFn: () => getChurn({}),
  });

  const { data: crossSell, isLoading: loadingCross } = useQuery({
    queryKey: ["cross-sell"],
    queryFn: () => getOpportunities({}),
  });

  const { data: benchmark, isLoading: loadingBench } = useQuery({
    queryKey: ["benchmark"],
    queryFn: () => getBenchmark({}),
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Status do Mês */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Zap className="size-8 text-primary fill-primary/20" /> Command Center
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Inteligência de Vendas em Tempo Real</p>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-2xl p-4 shadow-sm">
          <div className="text-right">
            <div className="text-sm font-medium text-muted-foreground">Projeção de Fechamento</div>
            <div className="text-2xl font-bold text-primary">R$ {formatCurrencyCompact(narrative?.context?.projection_end_of_month ?? 0)}</div>
          </div>
          <div className="h-10 w-px bg-border mx-2" />
          <div className="text-right">
            <div className="text-sm font-medium text-muted-foreground">Meta atingida</div>
            <div className="text-2xl font-bold text-emerald-500">84%</div>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* IA Narrativa & Alertas */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden relative border-2 shadow-lg">
            <div className="absolute top-0 right-0 p-4">
               <Sparkles className="size-6 text-primary/40" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                Insights da Manhã (IA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingNarrative ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Gerando análise comercial...</span>
                </div>
              ) : (
                <>
                  <p className="text-lg leading-relaxed font-medium">
                    {narrative?.headline}
                  </p>
                  <div className="text-muted-foreground whitespace-pre-wrap">
                    {narrative?.narrative}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                      <div className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Destaque Positivo</div>
                      <div className="text-sm font-semibold">{narrative?.win}</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                      <div className="text-[10px] font-bold uppercase text-amber-600 mb-1">Ponto de Atenção</div>
                      <div className="text-sm font-semibold">{narrative?.risk}</div>
                    </div>
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl">
                      <div className="text-[10px] font-bold uppercase text-primary mb-1">Ação Sugerida</div>
                      <div className="text-sm font-semibold">{narrative?.action}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Churn Preditivo */}
            <Card className="border-destructive/20 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="size-5 text-destructive" /> Alertas de Churn
                </CardTitle>
                <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20">Urgente</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-2">
                  {loadingChurn ? (
                     <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                  ) : churnRisks?.map((risk: any) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={risk.id} 
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border bg-card/50"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-sm">{risk.name}</div>
                        <div className="text-xs text-muted-foreground">Queda de {risk.drop}% vs mês ant.</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-destructive flex items-center justify-end">
                          <ArrowDownRight className="size-3 mr-0.5" /> R$ {formatCurrencyCompact(risk.current)}
                        </div>
                        <Button size="icon" variant="ghost" className="size-7" asChild>
                          <Link to={`/clientes?id=${risk.id}`}><ChevronRight className="size-4" /></Link>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Oportunidades Cross-sell */}
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ShoppingBag className="size-5 text-primary" /> Cross-Sell Gaps
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">Oportunidades</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-2">
                  {loadingCross ? (
                    <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                  ) : crossSell?.map((op: any, i: number) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i} 
                      className="flex items-center justify-between p-3 rounded-xl border bg-card/50 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-sm">{op.line}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Mix Sugerido</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-primary">Alto Potencial</div>
                        <Button variant="link" size="sm" className="h-6 p-0 text-xs">Atribuir</Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar de Ranking e Metas */}
        <div className="space-y-6">
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="size-5 text-amber-500" /> Top Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {loadingBench ? (
                  <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                ) : benchmark?.rows.slice(0, 5).map((r: any, i: number) => (
                  <div key={r.rep} className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          i === 0 ? "bg-amber-500 text-white" : 
                          i === 1 ? "bg-slate-300 text-slate-700" : 
                          i === 2 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <div className="font-medium text-sm">{r.rep}</div>
                      </div>
                      <div className="text-xs font-bold">R$ {formatCurrencyCompact(r.revenue)}</div>
                    </div>
                    <Progress value={(r.revenue / (benchmark?.rows[0]?.revenue || 1)) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-6" asChild>
                <Link to="/representantes">Ver Ranking Completo</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-foreground text-background shadow-xl">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                  <Target className="size-4" /> Goal Tracker
                </div>
                <div className="text-3xl font-bold">R$ {formatCurrencyCompact(narrative?.context?.mtd_revenue ?? 0)}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-background/60 font-medium">
                    <span>Faturamento Atual</span>
                    <span>Meta: R$ 4.2M</span>
                  </div>
                  <Progress value={84} className="h-2 bg-background/20" />
                </div>
                <div className="p-3 bg-background/10 rounded-xl border border-background/20 flex items-center justify-between">
                  <div className="text-xs">Tendência de Fechamento</div>
                  <div className="text-sm font-bold flex items-center text-emerald-400">
                    <ArrowUpRight className="size-4 mr-1" /> +12.4%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function Trophy({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
