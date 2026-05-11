// Server-only Resend gateway helper.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "AgroGestão CRM <onboarding@resend.dev>";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  reply_to?: string;
}

export async function sendResendEmail(input: SendEmailInput) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY ausente");
  if (!resendKey) throw new Error("RESEND_API_KEY ausente (conector Resend)");

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to,
      subject: input.subject,
      html: input.html,
      reply_to: input.reply_to,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as { id?: string };
}

export function wrap(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;color:#111827;margin:0 0 16px">${title}</h1>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
  <p style="font-size:12px;color:#6b7280;margin:0">AgroGestão CRM</p>
</div></body></html>`;
}
