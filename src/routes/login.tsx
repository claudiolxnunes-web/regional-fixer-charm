import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — AgroGestão CRM" },
      { name: "description", content: "Acesse sua conta no AgroGestão CRM ou crie uma nova para gerenciar seu time comercial do agronegócio." },
      { property: "og:title", content: "Entrar — AgroGestão CRM" },
      { property: "og:description", content: "Acesse o AgroGestão CRM ou crie sua conta para gerenciar seu time comercial." },
      { property: "og:url", content: "https://regional-fixer-charm.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://regional-fixer-charm.lovable.app/login" }],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        fetch("/api/public/hooks/send-welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name }),
        }).catch(() => {});
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error((result.error as any).message ?? "Falha no login com Google");
        return;
      }
      if (result.redirected) return; // browser will navigate
      navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  }

  async function onForgot(e: FormEvent) {
    e.preventDefault();
    setForgotBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Enviamos um e-mail com o link para redefinir sua senha.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar e-mail");
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto size-20 rounded-xl bg-white grid place-items-center mb-3 overflow-hidden border">
            <img src={logo} alt="AgroGestão CRM" className="size-19 object-contain" />
          </div>
          <CardTitle className="text-2xl">AgroGestão CRM</CardTitle>
          <CardDescription>{mode === "signin" ? "Entre na sua conta" : "Crie sua conta"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
            <GoogleIcon />
            Continuar com Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou com e-mail</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Cadastrar"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>Não tem conta?{" "}
                <button className="text-primary font-medium" onClick={() => setMode("signup")}>Cadastre-se</button>
              </>
            ) : (
              <>Já tem conta?{" "}
                <button className="text-primary font-medium" onClick={() => setMode("signin")}>Entrar</button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Esqueci minha senha</DialogTitle>
            <DialogDescription>
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onForgot} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={forgotBusy}>{forgotBusy ? "Enviando..." : "Enviar link"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.97 6.97 0 0 1 5.46 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
