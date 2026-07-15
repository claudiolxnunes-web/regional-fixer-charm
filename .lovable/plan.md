# Ajustar visual e layout do painel lateral de drill-down

## Contexto
O painel lateral (`DrillDownSheet`) em `/relatorios` já está funcional: abre ao clicar numa barra dos gráficos de "Mix por linha" ou "Faturamento por UF", mostra KPIs do recorte e uma tabela com as linhas de venda. Ajustamos agora o visual e a disposição para deixar o painel mais claro, responsivo e alinhado ao design system do app.

## O que será ajustado

1. **Header do painel**
   - Usar `Badge` para destacar o nome da linha/UF selecionada.
   - Adicionar subtítulo com o total de linhas de venda e o período ativo.

2. **Grid de KPIs**
   - Manter 2 colunas em mobile, mas ajustar padding e espaçamento para não ficar apertado.
   - Adicionar cor/ícone sutil para diferenciar os KPIs do painel dos KPIs da página principal.
   - Garantir que os valores grandes quebrem linha corretamente (`break-words`).

3. **Tabela do recorte**
   - Garantir scroll horizontal quando necessário (evitar corte de colunas em telas estreitas).
   - Formatar data no padrão `DD/MM/AAAA` em vez de `YYYY-MM-DD`.
   - Ajustar larguras das colunas: Data, Cliente, Representante, UF/Linha, Receita.
   - Substituir `key={i}` por chave composta (`invoice_number` + `client_id` + `invoice_date`).

4. **Feedback visual de clique nos gráficos**
   - Adicionar `cursor="pointer"` já existe nas barras; confirmar que o tooltip indica ação clicável.
   - Opcionalmente mostrar um pequeno texto hint abaixo do título dos gráficos (já existe, apenas revisar).

5. **Responsividade geral do Sheet**
   - Manter `w-full sm:max-w-2xl`, mas revisar padding interno para mobile.
   - Verificar se o conteúdo cabe bem em telas pequenas sem scroll geral desconfortável.

## Fora de escopo
- Não alterar a lógica de agregação dos dados.
- Não adicionar novos KPIs, top clientes/reps ou export CSV no painel (só visual/layout).
- Não alterar outros gráficos ou filtros da página `/relatorios`.
- Não mudar o design system global (tokens, cores, fontes) — ajustes locais no painel apenas.

## Validação
- Build do projeto passa sem erros.
- Preview de /relatorios mostra o painel com novo layout, header destacado, data formatada e tabela responsiva.
- Clique nos gráficos continua abrindo o painel corretamente.