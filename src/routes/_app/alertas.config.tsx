import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Save, RotateCcw, ArrowLeft, FlaskConical } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/alertas/config")({ component: AlertConfigPage });

type Field = {
  key: string;
  label: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
};
type Rule = { type: string; title: string; description: string; defaults: Record<string, number>; fields: Field[] };

const RULES: Rule[] = [
  {
    type: "inactive_client",
    title: "Cliente inativo",
    description: "Cliente sem compras há vários meses. Recorrente mensal.",
    defaults: { months_medium: 3, months_high: 6 },
    fields: [
      { key: "months_medium", label: "Meses para alerta médio", min: 1, max: 24, step: 1, suffix: "meses" },
      { key: "months_high", label: "Meses para alerta alto", min: 1, max: 36, step: 1, suffix: "meses" },
    ],
  },
  {
    type: "consumption_drop",
    title: "Queda de consumo",
    description: "Compara últimos N meses vs N meses anteriores (receita).",
    defaults: { min_drop_pct: 30, high_drop_pct: 60, window_months: 3 },
    fields: [
      { key: "window_months", label: "Janela de comparação", min: 1, max: 12, step: 1, suffix: "meses" },
      { key: "min_drop_pct", label: "Queda mínima (médio)", min: 5, max: 100, step: 5, suffix: "%" },
      { key: "high_drop_pct", label: "Queda para alerta alto", min: 5, max: 100, step: 5, suffix: "%" },
    ],
  },
  {
    type: "low_stock",
    title: "Estoque baixo no cliente",
    description: "Detecta atraso na recompra com base no intervalo histórico.",
    defaults: { interval_factor_medium: 1.5, interval_factor_high: 2.0, max_days: 90, min_purchases: 3 },
    fields: [
      { key: "min_purchases", label: "Mínimo de compras históricas", min: 2, max: 20, step: 1, suffix: "compras" },
      { key: "interval_factor_medium", label: "Fator atraso (médio)", min: 1, max: 5, step: 0.1, suffix: "× intervalo" },
      { key: "interval_factor_high", label: "Fator atraso (alto)", min: 1, max: 5, step: 0.1, suffix: "× intervalo" },
      { key: "max_days", label: "Máx. dias sem compra (acima vira inativo)", min: 30, max: 365, step: 5, suffix: "dias" },
    ],
  },
  {
    type: "goal_at_risk",
    title: "Meta em risco",
    description: "Compara % atingido vs % esperado pelo dia do mês.",
    defaults: { warn_pct: 80, high_pct: 50 },
    fields: [
      { key: "warn_pct", label: "Disparar se atingido < deste % do pacing", min: 10, max: 100, step: 5, suffix: "%" },
      { key: "high_pct", label: "Alerta alto se < deste % do pacing", min: 10, max: 100, step: 5, suffix: "%" },
    ],
  },
  {
    type: "quote_expiring",
    title: "Proposta vencendo",
    description: "Propostas pendentes próximas do vencimento.",
    defaults: { warn_days: 7, high_days: 2 },
    fields: [
      { key: "warn_days", label: "Avisar quando faltarem", min: 1, max: 60, step: 1, suffix: "dias" },
      { key: "high_days", label: "Alerta alto quando faltarem", min: 0, max: 30, step: 1, suffix: "dias" },
    ],
  },
];

function AlertConfigPage() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["alert_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alert_settings").select("*");
      if (error) throw error;
      const map: Record<string, Record<string, number>> = {};
      (data ?? []).forEach((r: any) => { map[r.rule_type] = r.config || {}; });
      return map;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Settings2 className="size-6" /> Configuração de Alertas
          </h1>
          <p className="text-sm text-muted-foreground">
            Ajuste os limites e severidades de cada regra. {!isStaff && "(Apenas leitura — só gestores podem editar.)"}
          </p>
        </div>
        <div className="flex gap-2">
          {isStaff && <TestNowButton onDone={() => qc.invalidateQueries({ queryKey: ["alerts_list"] })} />}
          <Button asChild variant="outline" size="sm">
            <Link to="/alertas"><ArrowLeft className="size-4 mr-1" /> Voltar para alertas</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando...</Card>
      ) : (
        <div className="grid gap-4">
          {RULES.map((rule) => (
            <RuleCard
              key={rule.type}
              rule={rule}
              initial={{ ...rule.defaults, ...(data?.[rule.type] || {}) }}
              canEdit={isStaff}
              onSaved={() => qc.invalidateQueries({ queryKey: ["alert_settings"] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  inactive_client: "Cliente inativo",
  consumption_drop: "Queda de consumo",
  low_stock: "Estoque baixo",
  goal_at_risk: "Meta em risco",
  quote_expiring: "Proposta vencendo",
};
const SEV_CLS: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

function TestNowButton({ onDone }: { onDone: () => void }) {
  const [last, setLast] = useState<any>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const run = useMutation({
    mutationFn: async () => {
      const startedAt = new Date().toISOString();
      const res = await fetch("/api/public/hooks/run-alerts", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const { data: newRows, error } = await supabase
        .from("alerts")
        .select("id, type, severity, client_name, client_code, message, created_at, representative_id")
        .gte("created_at", startedAt)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const repIds = Array.from(new Set((newRows ?? []).map((r: any) => r.representative_id).filter(Boolean)));
      let repMap: Record<string, string> = {};
      if (repIds.length) {
        const { data: reps } = await supabase.from("representatives").select("id, name, rep_code").in("id", repIds);
        (reps ?? []).forEach((r: any) => { repMap[r.id] = r.name || r.rep_code || "—"; });
      }
      return { counts: json.counts, rows: (newRows ?? []).map((r: any) => ({ ...r, rep_name: r.representative_id ? repMap[r.representative_id] : "—" })) };
    },
    onSuccess: (d: any) => {
      setLast(d.counts);
      setRows(d.rows);
      const total = d.counts?.total ?? 0;
      toast.success(`Teste concluído: ${total} novo(s) alerta(s)`);
      onDone();
    },
    onError: (e: any) => toast.error(e.message || "Erro no teste"),
  });
  return (
    <>
      <Button size="sm" variant="default" disabled={run.isPending} onClick={() => run.mutate()} title="Executa as regras agora com os thresholds salvos">
        <FlaskConical className={`size-4 mr-1 ${run.isPending ? "animate-pulse" : ""}`} />
        {run.isPending ? "Testando..." : last ? `Testar de novo (último: ${last.total ?? 0})` : "Testar agora"}
      </Button>
      {rows !== null && (
        <TestResultPanel counts={last} rows={rows} onClear={() => { setRows(null); setLast(null); }} />
      )}
    </>
  );
}

function TestResultPanel({ counts, rows, onClear }: { counts: any; rows: any[]; onClear: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-auto p-4" onClick={onClear}>
      <Card className="max-w-5xl mx-auto p-5 mt-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3 gap-3">
          <div>
            <h3 className="font-semibold">Resultado do teste — {counts?.total ?? 0} novo(s) alerta(s)</h3>
            <p className="text-xs text-muted-foreground">
              Inativos: {counts?.inactive_client ?? 0} · Queda: {counts?.consumption_drop ?? 0} · Estoque: {counts?.low_stock ?? 0} · Meta: {counts?.goal_at_risk ?? 0} · Propostas: {counts?.quote_expiring ?? 0}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onClear}>Fechar</Button>
        </div>
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">Regra</th>
                <th className="text-left p-2 font-medium">Severidade</th>
                <th className="text-left p-2 font-medium">Cliente</th>
                <th className="text-left p-2 font-medium">Representante</th>
                <th className="text-left p-2 font-medium">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {!rows.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum alerta novo. Os thresholds atuais não dispararam nada (ou já existiam alertas neste mês — dedupe).</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{TYPE_LABEL[r.type] || r.type}</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded text-[10px] uppercase ${SEV_CLS[r.severity] || ""}`}>{r.severity}</span></td>
                  <td className="p-2">{r.client_name || r.client_code || "—"}</td>
                  <td className="p-2">{r.rep_name || "—"}</td>
                  <td className="p-2 max-w-md">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Dica: a função tem dedupe mensal por cliente/representante/proposta. Se nada apareceu, pode ser que os alertas deste mês já tenham sido gerados antes — abra <Link to="/alertas" className="underline">/alertas</Link> e filtre por "Todos".
        </p>
      </Card>
    </div>
  );
}

function RuleCard({
  rule, initial, canEdit, onSaved,
}: { rule: Rule; initial: Record<string, number>; canEdit: boolean; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, number>>(initial);
  useEffect(() => { setValues(initial); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(initial)]);

  const save = useMutation({
    mutationFn: async () => {
      // Validação: garantir números válidos dentro dos limites
      for (const f of rule.fields) {
        const v = Number(values[f.key]);
        if (!Number.isFinite(v)) throw new Error(`${f.label}: valor inválido`);
        if (f.min !== undefined && v < f.min) throw new Error(`${f.label}: mínimo ${f.min}`);
        if (f.max !== undefined && v > f.max) throw new Error(`${f.label}: máximo ${f.max}`);
      }
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("alert_settings").upsert({
        rule_type: rule.type,
        config: values,
        updated_at: new Date().toISOString(),
        updated_by: u.user?.id ?? null,
      }, { onConflict: "rule_type" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${rule.title}: configuração salva`); onSaved(); },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold">{rule.title}</h3>
          <p className="text-xs text-muted-foreground">{rule.description}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!dirty}
              onClick={() => setValues(rule.defaults)}
              title="Restaurar padrões"
            >
              <RotateCcw className="size-4 mr-1" /> Padrões
            </Button>
            <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              <Save className="size-4 mr-1" /> Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {rule.fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs">{f.label}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={f.min}
                max={f.max}
                step={f.step ?? 1}
                disabled={!canEdit}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: Number(e.target.value) })}
              />
              {f.suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{f.suffix}</span>}
            </div>
            {f.hint && <p className="text-[10px] text-muted-foreground">{f.hint}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
