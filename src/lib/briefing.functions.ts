import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const InputSchema = z.object({ client_id: z.string().uuid() });

export const generateClientBriefing = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const aiKey = process.env.LOVABLE_API_KEY;
    if (!aiKey) throw new Error("LOVABLE_API_KEY não configurada");
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [{ data: client }, salesRes, activitiesRes, quotesRes, alertsRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", data.client_id).maybeSingle(),
      supabase
        .from("sales")
        .select("invoice_date, revenue, line, product, quantity")
        .eq("client_id", data.client_id)
        .order("invoice_date", { ascending: false })
        .limit(200),
      supabase
        .from("activities")
        .select("type, title, status, scheduled_at, completed_at, outcome")
        .eq("client_id", data.client_id)
        .order("scheduled_at", { ascending: false })
        .limit(20),
      supabase
        .from("quotes")
        .select("status, total, valid_until, created_at")
        .eq("client_id", data.client_id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("alerts")
        .select("type, severity, title, message, created_at, status")
        .eq("client_id", data.client_id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (!client) throw new Error("Cliente não encontrado");

    const sales = salesRes.data ?? [];
    const total = sales.reduce((s, x) => s + Number(x.revenue ?? 0), 0);
    const byLine: Record<string, number> = {};
    sales.forEach((s) => {
      const k = s.line ?? "—";
      byLine[k] = (byLine[k] ?? 0) + Number(s.revenue ?? 0);
    });
    const lastSale = sales[0]?.invoice_date ?? null;
    const daysSinceLast = lastSale
      ? Math.floor((Date.now() - new Date(lastSale).getTime()) / 86400000)
      : null;

    const summary = {
      cliente: {
        nome: client.name,
        codigo: client.client_code,
        tipo: client.type,
        cidade: client.city,
        estado: client.state,
        segmento: client.segment,
        classe_abc: client.abc_class,
        status: client.effective_status ?? client.status,
      },
      historico: {
        total_compras: Math.round(total),
        ultima_compra_dias_atras: daysSinceLast,
        mix_por_linha: Object.entries(byLine).map(([line, rev]) => ({ line, revenue: Math.round(rev) })),
        ultimas_5_compras: sales.slice(0, 5).map((s) => ({
          data: s.invoice_date,
          linha: s.line,
          produto: s.product,
          qtd: s.quantity,
          valor: Number(s.revenue ?? 0),
        })),
      },
      atividades_recentes: activitiesRes.data ?? [],
      propostas_recentes: quotesRes.data ?? [],
      alertas_ativos: (alertsRes.data ?? []).filter((a) => a.status !== "resolved"),
    };

    const prompt = `Você é um consultor comercial sênior de uma distribuidora agro (ruminantes/aves/suínos). Prepare um BRIEFING PRÉ-VISITA conciso para o representante usar hoje. Use os dados em JSON abaixo.

Estrutura obrigatória da resposta em markdown (use ## como cabeçalhos):

## Resumo do cliente
2-3 linhas de contexto rápido.

## Sinais a observar
3 bullets curtos com indicadores positivos/negativos detectados no histórico.

## Mix sugerido para esta visita
Produtos/linhas a oferecer com base no padrão de compras (3 itens, justificando cada um em 1 linha).

## Risco e oportunidade
1 frase de cada.

## Roteiro de abertura (SPIN)
- **S:** uma pergunta de situação
- **P:** uma pergunta de problema
- **I:** uma pergunta de implicação
- **N:** uma pergunta de necessidade

## Próximo passo recomendado
1 ação concreta com prazo.

Linguagem direta, em português do Brasil, sem floreios.

DADOS:
${JSON.stringify(summary, null, 2)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um consultor comercial agro experiente, direto e prático." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Falha IA: ${aiRes.status} ${err.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const briefing: string = aiJson.choices?.[0]?.message?.content ?? "Sem briefing disponível.";

    return { briefing, summary };
  });
