---
name: Backlog em fases
description: Roadmap acordado com o usuário, executar uma fase por vez
type: feature
---
# Backlog

## Fase 1 — Finalizar pendências
- [x] Esconder MB%/MB em /vendas para representante
- [x] Página /propostas (gestor aprova/rejeita orçamentos)
- [ ] PWA / modo offline completo (SW + fila de sync)

## Fase 2 — Alertas comerciais ✅ CONCLUÍDA
- [x] Cliente inativo, queda de consumo, estoque baixo, meta em risco, proposta vencendo
- [x] E-mail diário (daily-digest) e WhatsApp (run-alerts) via cron
- [x] Crons protegidos por `CRON_SECRET` (header `x-cron-secret`)
- [x] Log de execução em `job_runs`

## Fase 3 — IA aplicada ✅ ENTREGUE
- [x] Copiloto, IA Insights, Inteligência, Analytics
- [ ] Consolidar telas de IA sobrepostas (relatorios/analytics/inteligencia)

## Fase 4 — Planejamento SPIN ✅ ENTREGUE
- [x] Roteirizador, checklist SPIN, planejamento-visitas

## Fase 5 — Automações ✅ ENTREGUE
- [x] Cron de alertas, envio de e-mail, workflow de aprovação de propostas

## Melhorias de segurança/perf implementadas
- [x] `wipeTable` server fn com checagem admin server-side (substitui delete client-side)
- [x] AlertDialog no lugar de `confirm()` nativo em /importacao
- [x] Índices: `sales(team_id,representative_id)`, `sales(invoice_date)`, `alerts(team_id,severity,whatsapp_sent_at)`, `alerts(created_at)`
- [x] Tabela `job_runs` (admin-only) para diagnosticar crons

## Pendentes de segurança
- [ ] REVOKE SELECT das colunas de margem (`mb_cb_*`, `commission_value`, `ml_cb_*`) de `authenticated` em `sales` — exige refatorar queries para usar `sales_rep_view` / `sales_secure_view`
- [ ] Paginação server-side em /vendas (hoje carrega 50k linhas)
- [ ] Consolidar telas de IA sobrepostas
