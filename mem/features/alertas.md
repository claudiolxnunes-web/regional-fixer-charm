---
name: Alertas comerciais
description: Regras de disparo e canais para alertas de inatividade, queda de consumo, estoque baixo, meta em risco
type: feature
---
# Regras de alerta (definidas pelo usuário)

## Cliente inativo
- Trigger: cliente sem compra há **3 meses ou mais** (baseado em invoice_date em sales)
- Frequência: **alerta mensal recorrente** (a cada mês que passar sem compra a partir do 3º)
- Não disparar uma vez só — repetir todo mês

## Canais de notificação (todos os alertas)
- Painel dentro do sistema (badge + lista em /alertas)
- E-mail (consolidado diário)
- WhatsApp via Twilio (connector já documentado)

## Outros alertas previstos (Fase 2)
- Queda de consumo (média mensal caindo X%)
- Estoque baixo no cliente (baseado em giro estimado)
- Proposta vencendo / sem resposta
- Meta em risco (rep abaixo do pacing mensal)
