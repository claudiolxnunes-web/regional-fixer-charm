# Plano — Finalização das abas pendentes + Planejamento SMART/SPIN

Stripe fica fora do escopo (será feito pelo programador externo). Foco: completar as abas que faltam e adicionar dois módulos novos de planejamento.

## Fase A — Auditoria e correção das abas existentes

### 1. Relatórios (`/relatorios`)
- Verificar geração e exibição (vendas mensais, ranking de representantes, ranking de clientes, mix de produtos).
- Adicionar exportação CSV/PDF por relatório.
- Filtros: período, representante, linha, região.

### 2. Alertas (`/alertas` + `/alertas/config`)
- Conferir se `generate_all_alerts()` está sendo executado (cron mensal já configurado).
- Botão "Gerar agora" no painel para teste manual.
- Garantir badge de alertas não lidos no menu.
- Validar canais: painel ✓ / e-mail (Resend) / WhatsApp (Twilio).

### 3. Mapa de calor (`/mapa`)
- Substituir lista por **mapa real** (Leaflet + OpenStreetMap, sem API key).
- Camada de heatmap por densidade de clientes e por receita (toggle).
- Marcadores agrupados (cluster) com popup: cliente, cidade, classe ABC, receita.
- Filtros: UF, representante, classe ABC.

### 4. Analytics avançado (`/analytics`)
- Conferir KPIs e gráficos. Adicionar:
  - Receita YoY / MoM, ticket médio, frequência de compra.
  - Funil de oportunidades, taxa de conversão por etapa.
  - Mix de produto (linha/solução), curva ABC de clientes.
  - Cohort de retenção (clientes que voltaram a comprar).

### 5. IA Insights (`/ia-insights`)
- Já gera 5 insights via Lovable AI. Adicionar:
  - Histórico (salvar últimas execuções na tabela `ia_insights`).
  - Análises específicas: churn risk por cliente, próximo melhor produto, resumo executivo mensal.
  - Botão "Enviar por e-mail" para o gestor.

### 6. Atividades (`/atividades`)
- Conferir CRUD (criar, editar, concluir, cancelar).
- Calendário semanal/mensal (toggle).
- Filtros: representante, cliente, status, tipo (visita, ligação, e-mail, reunião).
- Vínculo com oportunidades e clientes.

## Fase B — Planejamento estratégico (NOVO)

### 7. Planejamento SMART do Gestor — `/planejamento` (apenas admin/manager)
Página para definir e acompanhar metas estratégicas pelo método SMART (Específico, Mensurável, Atingível, Relevante, Temporal).

**Funcionalidades:**
- Criar plano semanal e/ou mensal.
- Cada plano tem N objetivos SMART, com:
  - Título, descrição, métrica (KPI), valor-alvo, valor atual, prazo, responsável (rep ou time).
  - Status: planejado, em andamento, concluído, atrasado.
  - Ações associadas (lista de tarefas/checkpoints).
- Dashboard de acompanhamento: % de conclusão, progresso por objetivo.
- Vínculo automático com `goal_targets` (metas de receita) quando aplicável.

**Tabelas novas:**
- `strategic_plans` (id, team_id, title, period_type='weekly'|'monthly', start_date, end_date, status, owner_id)
- `strategic_objectives` (id, plan_id, title, description, metric, target_value, current_value, due_date, assigned_rep_id, status, smart_data jsonb)
- `strategic_actions` (id, objective_id, title, done, done_at)

### 8. Planejamento SPIN do Representante — `/planejamento-visitas` (representante)
Roteirizador de visitas usando método SPIN (Situation, Problem, Implication, Need-payoff).

**Funcionalidades:**
- Listar visitas planejadas da semana (puxa de `activities` tipo=visit).
- Para cada visita, checklist SPIN preenchido pelo rep:
  - **Situação**: contexto atual do cliente (o que ele compra hoje, volume).
  - **Problema**: dor identificada (preço alto, atraso, qualidade, falta de produto).
  - **Implicação**: consequência da dor (perda de margem, churn, etc).
  - **Necessidade de solução**: benefício da nossa proposta (produto X resolve Y).
- Pós-visita: outcome estruturado, próximos passos, oportunidade gerada.
- Roteiro otimizado por proximidade geográfica (ordenar visitas do dia por lat/lng).

**Tabelas novas:**
- `visit_plans` (id, team_id, rep_user_id, week_start, status, notes)
- `spin_notes` (id, activity_id, situation, problem, implication, need_payoff, outcome, next_steps, created_at)

## Ordem de execução sugerida
1. **Fase A.6 (Atividades)** — base para SPIN.
2. **Fase A.3 (Mapa de calor)** — visual rápido, alto impacto.
3. **Fase B.7 (SMART)** + **B.8 (SPIN)** — módulos novos.
4. **Fase A.1, A.2, A.4, A.5** — refinos das abas existentes.

## Pergunta antes de começar
Quer que eu execute **tudo na ordem sugerida**, ou prefere começar por um módulo específico (ex: SMART/SPIN primeiro porque são os novos)?
