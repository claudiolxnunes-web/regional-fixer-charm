import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Terminal } from "lucide-react";

export function DiagnosticScreen() {
  const { session, loading: authLoading } = useAuth();
  const [dbStatus, setDbStatus] = useState<"checking" | "ok" | "error">("checking");
  const [permissions, setPermissions] = useState<any>(null);
  const [permError, setPermError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState<number>(0);

  useEffect(() => {
    // Get reload count
    try {
      const count = Number(sessionStorage.getItem("lvbl-app-permission-reload-count") ?? "0");
      setReloadCount(count);
    } catch (e) {
      console.error("Failed to read sessionStorage", e);
    }

    // Check DB connection
    const checkDb = async () => {
      try {
        const { data, error } = await supabase.from("team_members").select("id").limit(1);
        if (error) throw error;
        setDbStatus("ok");
      } catch (e) {
        console.error("DB check failed", e);
        setDbStatus("error");
      }
    };

    // Check Permissions specifically
    const checkPerms = async () => {
      if (!session?.user?.id) return;
      try {
        const { data, error } = await supabase
          .from("team_members")
          .select("role, team_id, teams(subscription_status, plan)")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (error) throw error;
        setPermissions(data);
      } catch (e: any) {
        setPermError(e.message || "Unknown error");
      }
    };

    checkDb();
    if (session) checkPerms();
  }, [session]);

  const handleReset = () => {
    try {
      sessionStorage.removeItem("lvbl-app-permission-reload-count");
      window.location.href = "/";
    } catch (e) {
      window.location.reload();
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 py-8 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Terminal className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Diagnóstico do Sistema</h1>
      </div>
      
      <p className="text-muted-foreground">
        Esta tela ajuda a identificar por que o aplicativo pode estar demorando para iniciar.
      </p>

      <div className="grid gap-6">
        {/* Auth Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Status de Autenticação</CardTitle>
              {authLoading ? (
                <Badge variant="outline" className="animate-pulse">Carregando...</Badge>
              ) : session ? (
                <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</Badge>
              ) : (
                <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Desconectado</Badge>
              )}
            </div>
            <CardDescription>Status da sua sessão no Supabase Auth</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {session ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">ID do Usuário:</span> <span className="font-mono text-[10px]">{session.user.id}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">E-mail:</span> <span>{session.user.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Último Login:</span> <span>{new Date(session.user.last_sign_in_at || "").toLocaleString()}</span></div>
              </>
            ) : (
              <p className="text-destructive font-medium">Nenhuma sessão ativa encontrada.</p>
            )}
          </CardContent>
        </Card>

        {/* Database & Connectivity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conectividade e Banco de Dados</CardTitle>
              {dbStatus === "checking" ? (
                <Badge variant="outline" className="animate-pulse">Verificando...</Badge>
              ) : dbStatus === "ok" ? (
                <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> OK</Badge>
              ) : (
                <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Erro</Badge>
              )}
            </div>
            <CardDescription>Conexão com as tabelas do projeto</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supabase URL:</span> 
              <span className="font-mono text-[10px] truncate max-w-[200px]">{import.meta.env.VITE_SUPABASE_URL}</span>
            </div>
            {dbStatus === "error" && (
              <p className="text-xs text-destructive mt-2">
                Não foi possível realizar uma consulta simples ao banco. Verifique sua conexão ou se há bloqueios de rede.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Permissões e Acesso</CardTitle>
              {permissions ? (
                <Badge className="bg-green-500">Recuperado</Badge>
              ) : permError ? (
                <Badge variant="destructive">Falhou</Badge>
              ) : (
                <Badge variant="outline">Pendente</Badge>
              )}
            </div>
            <CardDescription>Verificação de cargo e assinatura</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {permissions ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Cargo:</span> <span className="capitalize font-medium">{permissions.role}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ID do Time:</span> <span className="font-mono text-[10px]">{permissions.team_id}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status Assinatura:</span> 
                  <span className="capitalize">{permissions.teams?.subscription_status || "N/A"}</span>
                </div>
              </>
            ) : permError ? (
              <p className="text-destructive font-medium">Erro: {permError}</p>
            ) : (
              <p className="text-muted-foreground italic">Aguardando validação da sessão...</p>
            )}
          </CardContent>
        </Card>

        {/* Environment & State */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Estado da Aplicação</CardTitle>
            <CardDescription>Informações técnicas de execução</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tentativas de Recarregamento:</span> 
              <Badge variant={reloadCount > 0 ? "outline" : "secondary"}>{reloadCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plataforma:</span> 
              <span>{navigator.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">URL Atual:</span> 
              <span className="font-mono text-[10px]">{window.location.pathname}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row pt-4">
        <Button onClick={handleReset} className="flex-1 gap-2">
          <RefreshCw className="w-4 h-4" />
          Limpar Cache e Reiniciar App
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
          Atualizar Página
        </Button>
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        Se os problemas persistirem, tire um print desta tela e envie para o suporte.
      </p>
    </div>
  );
}
