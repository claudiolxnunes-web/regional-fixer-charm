import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Redefinir senha — AgroGestão CRM" },
      { name: "description", content: "Defina uma nova senha para sua conta no AgroGestão CRM." },
      { property: "og:title", content: "Redefinir senha — AgroGestão CRM" },
      { property: "og:description", content: "Defina uma nova senha para acessar o AgroGestão CRM." },
      { property: "og:url", content: "https://regional-fixer-charm.lovable.app/reset-password" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://regional-fixer-charm.lovable.app/reset-password" }],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery link automatically and emits PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also check if a session is already present (link opened in same tab)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida! Entrando...");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto size-20 rounded-xl bg-white grid place-items-center mb-3 overflow-hidden border">
            <img src={logo} alt="AgroGestão CRM" className="size-19 object-contain" />
          </div>
          <CardTitle className="text-2xl">Redefinir senha</CardTitle>
          <CardDescription>
            {ready ? "Defina sua nova senha" : "Validando link..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} disabled={!ready} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} disabled={!ready} />
            </div>
            <Button type="submit" disabled={loading || !ready} className="w-full">
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
