import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Preferências</h1>
        <p className="text-sm text-muted-foreground">Atualize seus dados de perfil e senha.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>E-mail</Label><Input value={email} disabled /></div>
          <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>URL do avatar</Label><Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." /></div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
            <Button variant="outline" onClick={changePassword}>Alterar senha</Button>
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
