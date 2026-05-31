import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  audio_base64: z.string().min(100).max(20_000_000),
  mime_type: z.string().min(3).max(100).default("audio/webm"),
  context: z.enum(["daily_report", "visit_spin"]).default("daily_report"),
});

export const transcribeAndStructure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const elKey = process.env.ELEVENLABS_API_KEY;
    const aiKey = process.env.LOVABLE_API_KEY;
    if (!elKey) throw new Error("ELEVENLABS_API_KEY não configurada");
    if (!aiKey) throw new Error("LOVABLE_API_KEY não configurada");

    // Decode base64 to buffer
    const buf = Buffer.from(data.audio_base64, "base64");
    const blob = new Blob([buf], { type: data.mime_type });

    // 1. Transcrição com ElevenLabs Scribe
    const fd = new FormData();
    fd.append("file", blob, "audio.webm");
    fd.append("model_id", "scribe_v2");
    fd.append("language_code", "por");
    fd.append("tag_audio_events", "false");
    fd.append("diarize", "false");

    const sttRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": elKey },
      body: fd,
    });
    if (!sttRes.ok) {
      const err = await sttRes.text();
      throw new Error(`Falha na transcrição: ${sttRes.status} ${err.slice(0, 200)}`);
    }
    const sttData = await sttRes.json();
    const transcript: string = sttData.text ?? "";
    if (!transcript.trim()) return { transcript: "", structured: null };

    // 2. Extração estruturada com Gemini
    const schemaPrompt =
      data.context === "visit_spin"
        ? `Extraia do relato uma visita comercial no método SPIN. Retorne JSON estrito:
{
 "spin_s": "Situação (fatos do cliente)",
 "spin_p": "Problema/dor identificada",
 "spin_i": "Implicação/consequência",
 "spin_n": "Necessidade/solução discutida",
 "observations": "Resumo geral",
 "visits_count": 1, "calls_count": 0, "proposals_count": 0, "orders_count": 0
}`
        : `Extraia do relato do representante os números do dia e observações. Retorne JSON estrito:
{
 "visits_count": 0, "calls_count": 0, "proposals_count": 0, "orders_count": 0,
 "observations": "Resumo limpo e claro do dia"
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você extrai dados estruturados de relatos comerciais em português do Brasil. Sempre responda apenas com JSON válido, sem markdown." },
          { role: "user", content: `${schemaPrompt}\n\nRELATO:\n"""${transcript}"""` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Falha na IA: ${aiRes.status} ${err.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let structured: any = null;
    try {
      structured = JSON.parse(content);
    } catch {
      structured = null;
    }
    return { transcript, structured };
  });
