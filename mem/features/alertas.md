---
name: Alertas comerciais
description: Regras de disparo, dedupe e canais para alertas (inativo, queda, estoque baixo, meta em risco, proposta vencendo)
type: feature
---
# Regras de alerta

Função orquestradora: `public.generate_all_alerts()` (chamada via `/api/public/hooks/run-alerts`, cron mensal dia 1 às 06:00).
Cada regra tem dedupe_key próprio para não duplicar no mesmo período.

## Cliente inativo (`inactive_client`)
- Sem compra há 3+ meses (severidade media), 6+ meses (high)
- Dedupe: `inactive_client:<client>:YYYY-MM` (recorrente mensal)

## Queda de consumo (`consumption_drop`)
- Compara receita dos últimos 3 meses vs 3 meses anteriores
- Dispara se queda >= 30%. High se >= 60%
- Dedupe: `consumption_drop:<client>:YYYY-MM`

## Estoque baixo no cliente (`low_stock`)
- Heurística: dias desde última compra > 1.5x intervalo médio histórico (mínimo 3 compras)
- Só até 90 dias (acima vira "inativo"). High se > 2x intervalo
- Dedupe: `low_stock:<client>:YYYY-MM`

## Meta em risco (`goal_at_risk`)
- Compara receita do mês atual do rep vs `goal_targets` do ano/mês
- Dispara se atingido < 80% do pacing esperado (dia/dias_no_mês). High se < 50% do pacing
- Dedupe: `goal_at_risk:<rep>:YYYY-MM`

## Proposta vencendo (`quote_expiring`)
- `quotes` com status pending e valid_until nos próximos 7 dias. High se <= 2 dias
- Dedupe: `quote_expiring:<quote_id>:<valid_until>` (uma vez por proposta)

## Canais de notificação
- Painel /alertas (já ativo)
- E-mail consolidado diário (a configurar)
- WhatsApp via Twilio (a configurar)
