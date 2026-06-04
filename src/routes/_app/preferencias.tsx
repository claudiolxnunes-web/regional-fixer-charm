import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Settings, Sparkles } from "lucide-react";
import { useTransitionSettings } from "@/hooks/use-transition-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TransitionType } from "@/components/PageTransition";

export const Route = createFileRoute("/_app/preferencias")({ component: Preferencias });

function Preferencias() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<{ plan: string; subscription_status: string; current_period_end: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { type, setType, duration, setDuration } = useTransitionSettings();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("full_name, avatar_url, phone").eq("id", user.id).maybeSingle();
      setFullName(data?.full_name ?? "");
      setAvatarUrl(data?.avatar_url ?? "");
      setPhone((data as any)?.phone ?? "");
      const { data: tm } = await supabase
        .from("team_members")
        .select("role, teams!inner(plan, subscription_status, current_period_end)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (tm) {
        setIsAdmin(tm.role === "admin");
        setTeam((tm as any).teams);
      }
    })();
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const url = await createPortalSession({
        data: { returnUrl: `${window.location.origin}/preferencias`, environment: getStripeEnvironment() },
      });
      if (url) window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  }

  async function save() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName, avatar_url: avatarUrl, phone } as any).eq("id", user.id);
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Preferências salvas");
  }

  async function changePassword() {
    const newPwd = prompt("Nova senha (mín 6 caracteres):");
    if (!newPwd || newPwd.length < 6) return;
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) toast.error(error.message); else toast.success("Senha atualizada");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Settings className="size-6 text-primary" /> Preferências
          </h1>
          <p className="text-sm text-muted-foreground">Atualize seus dados de perfil e senha.</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>E-mail</Label><Input value={email} disabled /></div>
          <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div>
            <Label>WhatsApp (com DDD)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 61 99675-7585" />
            <p className="text-xs text-muted-foreground mt-1">
              Receberá alertas de alta severidade. <strong>Sandbox Twilio:</strong> envie <code>join &lt;código&gt;</code> para <code>+1 415 523 8886</code> no WhatsApp uma vez para autorizar.
            </p>
          </div>
          <div><Label>URL do avatar</Label><Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." /></div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
            <Button variant="outline" onClick={changePassword}>Alterar senha</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Interface & Transições
          </CardTitle>
          <CardDescription>Configure os efeitos visuais de navegação entre as telas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Tipo de Transição</Label>
            <Select value={type} onValueChange={(v: TransitionType) => setType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o efeito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fade">Fade (Suave)</SelectItem>
                <SelectItem value="slide-left">Deslizar para Esquerda</SelectItem>
                <SelectItem value="slide-right">Deslizar para Direita</SelectItem>
                <SelectItem value="slide-up">Deslizar para Cima</SelectItem>
                <SelectItem value="slide-down">Deslizar para Baixo</SelectItem>
                <SelectItem value="zoom">Zoom In/Out</SelectItem>
                <SelectItem value="flip">Flip (Girar)</SelectItem>
                <SelectItem value="parallax">Parallax (Moderno)</SelectItem>
                <SelectItem value="none">Nenhuma (Instantâneo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Duração (segundos)</Label>
              <span className="text-xs font-mono">{duration}s</span>
            </div>
            <Slider 
              value={[duration]} 
              min={0.1} 
              max={1.5} 
              step={0.1} 
              onValueChange={(v) => setDuration(v[0])} 
            />
            <p className="text-[10px] text-muted-foreground italic">Duração menor é recomendada para melhor performance percebida.</p>
          </div>
        </CardContent>
      </Card>

      {isAdmin && team && (
        <Card>
          <CardHeader><CardTitle>Assinatura</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Plano atual:</span>
              <Badge variant="secondary" className="capitalize">{team.plan}</Badge>
              <Badge variant={team.subscription_status === "active" ? "default" : "destructive"}>
                {team.subscription_status}
              </Badge>
            </div>
            {team.current_period_end && (
              <p className="text-sm text-muted-foreground">
                Renovação / expira em: {new Date(team.current_period_end).toLocaleDateString("pt-BR")}
              </p>
            )}
            <Button onClick={openPortal} disabled={portalLoading} variant="outline">
              {portalLoading ? "Abrindo..." : "Gerenciar assinatura"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
