# Exportação completa do projeto

Para ter uma cópia 100% replicável do projeto além do código-fonte, você precisa dos seguintes artefatos:

## 1. Código-fonte e configuração de build (já existe)
- `src/` — componentes, rotas, hooks, server functions, utilitários
- `public/` — assets, PWA manifest, LLMs.txt, robots.txt
- `package.json`, `vite.config.ts`, `tsconfig.json`, `wrangler.jsonc`, `components.json`
- Lockfile de dependências (`bun.lockb` ou `package-lock.json`)

## 2. Schema e políticas do banco (parcialmente existe)
- `supabase/migrations/` — 60 migrações com tabelas, RLS, funções e triggers
- `supabase/config.toml` — configuração do projeto Cloud

## 3. Edge Functions (já existe)
- `supabase/functions/evolution-connect/index.ts` — integração WhatsApp/Evolution
- `supabase/functions/migrate-helper/index.ts` — helper de migração

## 4. Dados do banco (não está no repositório)
- CSVs ou SQL INSERTs de todas as tabelas (`sales`, `clients`, `open_orders`, `representatives`, `alerts`, etc.)
- 33 tabelas no schema `public`

## 5. Segredos e variáveis de ambiente (não devem ir no ZIP)
- `.env` / `.env.production` — publishable keys e tokens de pagamento
- Secrets do Cloud: `SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_API_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `LOVABLE_API_KEY`
- Esses devem ser reconfigurados manualmente no destino, nunca exportados em texto plano

## 6. Arquivos de Storage (não está no repositório)
- Buckets privados: `database_export_24_07_26`, `database_export_25_07_26`
- Eventuais avatares, logos, anexos de clientes, etc.

## 7. Configuração de Auth (não está no repositório)
- Provedores habilitados (Email, Google, etc.)
- Templates de e-mail e SMS
- Configuração de HIBP e confirmação de e-mail

## Proposta
Gerar um pacote completo contendo:
- Código fonte compactado
- Schema SQL completo (mesclando todas as migrações)
- Dados do banco em CSV/SQL
- Lista de secrets e variáveis que precisam ser reconfiguradas no destino
- Instruções de deploy e restauração

Não será gerado: tokens, chaves privadas ou senhas.
