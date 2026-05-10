# Plano: SaaS Multi-Tenant com Licença e Convites

## Modelo de negócio aprovado
- **Superadmin** (você): vê tudo, gerencia gestores
- **Gestor** (admin): paga licença Stripe, convida até 20 representantes, vê só a própria equipe
- **Representante** (user): entra por convite, vê só os próprios dados

**Preços:**
- Mensal R$ 297,00 (recorrente)
- Semestral R$ 1.514,70 à vista (15% off)
- Anual R$ 2.673,00 à vista (25% off)

---

## Etapas de implementação

### Etapa 1 — Banco de dados (multi-tenancy)
Adicionar a noção de "equipe/time" a tudo.

**Novas tabelas:**
- `teams` — uma por gestor (`owner_id`, `name`, `seat_limit=20`, `subscription_status`, `current_period_end`, `stripe_customer_id`, `stripe_subscription_id`, `plan` = mensal/semestral/anual)
- `team_members` — vincula `user_id` ↔ `team_id` ↔ `role` (admin/rep)
- `invites` — convites pendentes (`token`, `team_id`, `email` opcional, `role`, `expires_at`, `used_at`, `created_by`)
- `subscriptions_log` — histórico de pagamentos/eventos Stripe

**Coluna `team_id` em:** representatives, clients, sales, opportunities, quotes, activities, alerts, daily_reports, goals, goal_targets, open_orders, products, regions

**Novo enum de role:** `superadmin`, `admin`, `rep` (mantém compat com atual)

**RLS reescrito:** todas as tabelas filtram por `team_id = current_user_team_id()` (função SECURITY DEFINER). Superadmin bypassa. Representante adiciona filtro extra (`representative_id = current_rep_id()`) onde aplicável.

### Etapa 2 — Stripe (checkout + webhook)
- Habilitar Stripe built-in
- Criar 3 produtos no Stripe via `batch_create_product`:
  - "Plano Mensal" — R$ 297/mês recorrente
  - "Plano Semestral" — R$ 1.514,70 a cada 6 meses
  - "Plano Anual" — R$ 2.673,00 a cada 12 meses
- Tela `/planos` (pública, fora do `_app`): cards com 3 planos + botão "Assinar"
- Server function `create-checkout-session` cria sessão Stripe e devolve URL
- Webhook `/api/public/stripe/webhook`: ao receber `checkout.session.completed` ou `customer.subscription.updated`, cria/atualiza `teams` e dá role `admin` ao usuário pagante

### Etapa 3 — Onboarding do gestor pós-pagamento
- Após Stripe redirecionar para `/checkout/success`, criar a equipe (se webhook ainda não rodou) e direcionar para `/equipe`
- Tela `/equipe` (só admin): mostra plano ativo, status, próxima cobrança, botão "Gerenciar assinatura" (Stripe Customer Portal), e a área de convites

### Etapa 4 — Sistema de convites (link + QR + email)
**UI em `/equipe`:**
- Contador "5 de 20 representantes usados"
- Botão "Convidar representante" → modal com 3 abas:
  - **Link**: gera URL `https://app/convite/{token}`, botão "copiar"
  - **QR Code**: renderiza QR do mesmo link (lib `qrcode.react`)
  - **Email**: campo de email + envia automaticamente (requer dom. email configurado)
- Lista de convites pendentes com status (enviado/usado/expirado) e botão "revogar"

**Página pública `/convite/$token`:**
- Valida token via server function (não exposto antes do login)
- Form de cadastro (nome, email, senha) → cria conta Supabase, vincula em `team_members` com role `rep`, marca convite como usado, redireciona para `/dashboard`
- Bloqueia se já bateu o limite de 20

**Email de convite:**
- Requer setup do domínio de email (vou abrir o diálogo)
- Template "convite-equipe" com nome do gestor + botão "Aceitar convite"

### Etapa 5 — Travas de acesso
- Layout `_app` checa: `auth.uid` precisa ter `team_membership` ativo OU ser superadmin
- Se admin sem assinatura ativa → redirecionar para `/planos`
- Se rep sem time → tela "Aguardando convite"
- Página `/superadmin` (só você): lista de teams, status, MRR estimado, ações (suspender/reativar)

### Etapa 6 — Limpeza UI
- Remover do menu de admin/rep o que é exclusivo de superadmin (ex: configuração global de alertas vira superadmin-only)
- Botão "Sair" e "Gerenciar assinatura" no perfil

---

## Detalhes técnicos

**Stack adicional:**
- `qrcode.react` — gerar QR
- Stripe built-in (sem chaves manuais)
- Lovable Emails (dialog de setup de domínio será aberto na Etapa 4)

**Função SECURITY DEFINER chave:**
```sql
current_user_team_id() returns uuid
-- retorna o team_id do user atual (superadmin retorna NULL = vê tudo)
```

**Webhook Stripe (server route público com verificação HMAC):**
- Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Atualiza `teams.subscription_status` e `current_period_end`

**Migração de dados existentes:**
- Como você acabou de limpar a base, não precisa migrar nada. Você se torna superadmin automaticamente. Os primeiros gestores entrarão pelo `/planos`.

---

## Ordem de execução proposta

1. **Hoje (esta resposta):** Etapas 1+2+3 — banco, Stripe, checkout, onboarding básico do gestor. Você já consegue testar o fluxo "pagar → criar equipe".
2. **Próxima rodada:** Etapa 4 — sistema de convites (link + QR primeiro; email depois do setup do domínio).
3. **Última rodada:** Etapas 5+6 — travas finais, painel de superadmin, limpeza.

Isso evita um PR gigantesco e te deixa testar passo a passo.

---

## Pontos de atenção

- **Você precisa ser definido como superadmin manualmente** após esta etapa (rodo um INSERT no fim da Etapa 1).
- **Reset de RLS:** vou reescrever RLS em ~13 tabelas. Após a migração, a base vai ficar invisível até você assinar OU rodar o seed de superadmin (vou fazer junto).
- **Stripe ativa em modo teste** primeiro — você consegue simular pagamentos com cartão `4242 4242 4242 4242` antes de ir para live.
- **Email de convite:** se quiser pular agora, link+QR já cobrem 100% dos casos. Posso configurar email depois sem retrabalho.

Confirma o plano para eu começar pela Etapa 1+2+3?