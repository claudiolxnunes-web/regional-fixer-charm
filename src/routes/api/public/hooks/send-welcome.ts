import { createFileRoute } from "@tanstack/react-router";
import { sendResendEmail, wrap } from "@/lib/email.server";

// Endpoint público chamado logo após o cadastro do usuário.
// Sem auth — risco de abuso é baixo (apenas envia "boas-vindas" para o email informado).
export const Route = createFileRoute("/api/public/hooks/send-welcome")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { email, name } = (await request.json()) as { email?: string; name?: string };
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new Response(JSON.stringify({ error: "email inválido" }), { status: 400 });
          }
          const html = wrap(
            "Bem-vindo ao AgroGestão CRM 🌱",
            `<p>Olá${name ? `, <strong>${name}</strong>` : ""}!</p>
             <p>Sua conta foi criada com sucesso. Confirme seu email para começar a usar o sistema.</p>
             <p>Aqui você vai gerenciar clientes, propostas, vendas e receber alertas comerciais automáticos.</p>
             <p><a href="https://regional-fixer-charm.lovable.app/login" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Acessar o sistema</a></p>`,
          );
          await sendResendEmail({ to: email, subject: "Bem-vindo ao AgroGestão CRM", html });
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message ?? "fail" }), { status: 500 });
        }
      },
    },
  },
});
