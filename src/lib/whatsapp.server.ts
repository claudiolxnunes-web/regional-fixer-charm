// Twilio WhatsApp via Lovable connector gateway (sandbox).
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

// Sandbox Twilio WhatsApp sender. Recipients must opt-in once via the
// "join <code>" message in the Twilio sandbox.
export const WHATSAPP_FROM =
  process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Assume Brazil if no country code
  const e164 = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
  return `whatsapp:${e164}`;
}

export async function sendWhatsApp(toRaw: string, body: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  if (!lovableKey || !twilioKey) {
    throw new Error("Twilio não configurado (LOVABLE_API_KEY/TWILIO_API_KEY ausentes)");
  }
  const to = normalizePhone(toRaw);
  if (!to) throw new Error(`Telefone inválido: ${toRaw}`);

  const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: WHATSAPP_FROM, To: to, Body: body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Twilio ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as { sid?: string };
}
