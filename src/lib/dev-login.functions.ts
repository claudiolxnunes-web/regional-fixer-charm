import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Whitelist de e-mails autorizados para login rápido (dev / owner)
const ALLOWED_EMAILS = [
  "claudiolx.nunes@gmail.com",
  "clxn2000@hotmail.com",
];

export const devQuickLogin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ email: z.string().email() }).parse(input),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    if (!ALLOWED_EMAILS.includes(email)) {
      throw new Error("E-mail não autorizado para login rápido.");
    }

    // Garante que o usuário existe (cria se não existir, sem necessidade de senha).
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!existing) {
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
    }

    // Gera magic link — o action_link já loga o usuário ao ser aberto.
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error) throw new Error(error.message);
    const actionLink = link?.properties?.action_link;
    if (!actionLink) throw new Error("Não foi possível gerar o link de acesso.");
    return { url: actionLink };
  });
