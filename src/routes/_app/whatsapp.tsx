import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, Save, RefreshCw, CheckCircle2, XCircle, ExternalLink, QrCode, LogOut, Plus, Send, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { evolutionService, type EvolutionInstance } from "@/services/evolutionApi";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/_app/whatsapp")({ component: WhatsAppConfig });

function WhatsAppConfig() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    api_url: "https://evolution.bpfconsult.com.br",
    api_key: "",
    instance_name: "",
  });
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrCodeIssue, setQrCodeIssue] = useState<string | null>(null);
  const [lastQrAttemptLog, setLastQrAttemptLog] = useState<string | null>(null);
  const [status, setStatus] = useState<"connected" | "disconnected" | "checking">("disconnected");
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Teste de integração Evolution API.");
  const [pairingPhone, setPairingPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{ current: number; total: number } | null>(null);

  const mainInstance = instances.find((i) => i.instanceName === config.instance_name) ?? instances[0];
  const mainInstanceStatus = mainInstance?.status ?? "close";
  const activeInstanceName = mainInstance?.instanceName || config.instance_name;
  const instanceStatusLabel = mainInstanceStatus === "open" ? "WhatsApp conectado"
    : mainInstanceStatus === "connecting" ? "WhatsApp aguardando leitura"
    : mainInstanceStatus === "disconnecting" ? "WhatsApp desconectando"
    : "WhatsApp desconectado";

  const formatQrAttemptLog = (title: string, payload: unknown) => {
    const redact = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(redact);
      if (!value || typeof value !== "object") return value;
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => {
        const safe = k.toLowerCase();
        if (safe.includes("key") || safe.includes("token") || safe.includes("authorization")) return [k, "***"];
        return [k, redact(v)];
      }));
    };
    return JSON.stringify({
      title, when: new Date().toISOString(),
      instance: config.instance_name,
      phone: pairingPhone ? pairingPhone.replace(/\D/g, "") : null,
      payload: redact(payload),
    }, null, 2);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: tm } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .maybeSingle();
      const tid = tm?.team_id ?? null;
      setTeamId(tid);
      if (tid) await fetchConfig(tid);
    })();
  }, []);

  const fetchConfig = async (tid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("team_id", tid)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setConfig({
          api_url: data.api_url,
          api_key: data.api_key,
          instance_name: data.instance_name || "",
        });
        checkConnection(tid, data.instance_name || "");
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async (tid: string, instanceName: string) => {
    if (!tid || !instanceName) return;
    setStatus("checking");
    try {
      const data = await evolutionService.fetchInstances(tid, instanceName);
      setInstances(data);
      setStatus("connected");
    } catch (e) {
      console.error(e);
      setStatus("disconnected");
      setInstances([]);
    }
  };

  const handleSave = async () => {
    if (!teamId) {
      toast.error("Equipe não encontrada. Faça login novamente.");
      return;
    }
    if (!config.api_url || !config.api_key || !config.instance_name) {
      toast.error("Preencha URL, Chave Mestra e Nome da Instância.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("whatsapp_config")
        .upsert({
          team_id: teamId,
          api_url: config.api_url,
          api_key: config.api_key,
          instance_name: config.instance_name,
          updated_at: new Date().toISOString(),
        }, { onConflict: "team_id" });
      if (error) throw error;
      toast.success("Configuração salva");
      await fetchConfig(teamId);
    } catch (e: any) {
      toast.error(e.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInstance = async () => {
    if (!teamId || !config.instance_name) {
      toast.error("Defina o nome da instância e salve antes.");
      return;
    }
    setLoading(true);
    setQrCodeIssue(null);
    setLastQrAttemptLog(null);
    try {
      const r = await evolutionService.connect({
        teamId, instanceName: config.instance_name, phoneNumber: pairingPhone, action: "create",
      });
      setLastQrAttemptLog(formatQrAttemptLog("Criar/conectar instância", r.raw ?? r));
      setQrCode(r.base64 ?? null);
      setQrCodeText(r.code ?? null);
      setPairingCode(r.pairingCode ?? null);
      if (!r.base64 && !r.code && !r.pairingCode) {
        setQrCodeIssue("A Evolution respondeu, mas não enviou imagem de QR Code nem código de pareamento.");
      }
      toast.success(r.base64 || r.code ? "QR Code gerado. Escaneie para conectar." : "Instância criada.");
      checkConnection(teamId, config.instance_name);
    } catch (e: any) {
      setQrCodeIssue(e.message || "Falha ao criar instância");
      setLastQrAttemptLog(formatQrAttemptLog("Erro ao criar/conectar instância", e.details ?? { message: e.message }));
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowQrCode = async (instance: EvolutionInstance) => {
    if (!teamId) return;
    if (instance.status === "disconnecting") {
      toast.error("Instância ainda desconectando. Aguarde e tente novamente.");
      return;
    }
    setLoading(true);
    setQrCodeIssue(null);
    setQrCode(null);
    setQrCodeText(null);
    setPairingCode(null);
    setLastQrAttemptLog(null);
    try {
      const data = await evolutionService.connect({
        teamId, instanceName: instance.instanceName, phoneNumber: pairingPhone,
      });
      setLastQrAttemptLog(formatQrAttemptLog("Buscar QR Code", data.raw ?? data));
      setQrCode(data.base64 ?? null);
      setQrCodeText(data.code ?? null);
      setPairingCode(data.pairingCode ?? null);
      if (data.alreadyConnected || data.state === "open") {
        toast.success("Já conectado. Não é necessário escanear QR.");
        checkConnection(teamId, config.instance_name);
      } else if (!data.base64 && !data.code && !data.pairingCode) {
        const issue = data.count === 0
          ? "A API respondeu count: 0, sem QR Code."
          : `Resposta recebida, mas sem QR Code${data.state ? ` (status: ${data.state})` : ""}.`;
        setQrCodeIssue(issue);
        toast.error(issue);
      }
    } catch (e: any) {
      setQrCodeIssue(e.message || "Falha ao buscar QR Code");
      setLastQrAttemptLog(formatQrAttemptLog("Erro ao buscar QR Code", e.details ?? { message: e.message }));
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async (instanceName: string) => {
    if (!teamId || !testNumber) {
      toast.error("Digite um ou mais números separados por vírgula.");
      return;
    }
    const numbers = testNumber.split(",").map((n) => n.trim()).filter(Boolean);
    setSendingTest(true);
    setBatchStatus({ current: 0, total: numbers.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < numbers.length; i++) {
      setBatchStatus({ current: i + 1, total: numbers.length });
      try {
        await evolutionService.sendMessage({ teamId, instanceName, number: numbers[i], text: testMessage });
        ok++;
        if (numbers.length > 1 && i < numbers.length - 1) await new Promise((r) => setTimeout(r, 1000));
      } catch (e) {
        console.error(e);
        fail++;
      }
    }
    setSendingTest(false);
    setBatchStatus(null);
    if (numbers.length > 1) toast.success(`Envio finalizado: ${ok} sucessos, ${fail} falhas.`);
    else if (ok) toast.success("Mensagem enviada!");
    else toast.error("Falha ao enviar.");
  };

  const handleCopyLastQrLog = async () => {
    if (!lastQrAttemptLog) return;
    await navigator.clipboard.writeText(lastQrAttemptLog);
    toast.success("Log copiado");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">WhatsApp / Evolution API</h1>
          <p className="text-sm text-muted-foreground">Conecte um número de WhatsApp à sua equipe via Evolution API.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Credenciais</CardTitle>
              <CardDescription>Insira os dados da Evolution API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="api_url">URL da API</Label>
                <Input id="api_url" placeholder="https://evolution.bpfconsult.com.br"
                  value={config.api_url} onChange={(e) => setConfig({ ...config, api_url: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="api_key">Chave Mestra (Global API Key)</Label>
                <Input id="api_key" type="password" placeholder="Sua chave mestra"
                  value={config.api_key} onChange={(e) => setConfig({ ...config, api_key: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instance_name">Nome da Instância</Label>
                <Input id="instance_name" placeholder="agro_minhaempresa"
                  value={config.instance_name} onChange={(e) => setConfig({ ...config, instance_name: e.target.value })} />
                <p className="text-xs text-muted-foreground">Use um nome único por equipe (ex: agro_&lt;slug&gt;).</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Servidor:</span>
                  {status === "checking" && <span className="flex items-center gap-1 text-sm text-yellow-600"><RefreshCw className="size-4 animate-spin" /> Verificando...</span>}
                  {status === "connected" && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle2 className="size-4" /> Online</span>}
                  {status === "disconnected" && <span className="flex items-center gap-1 text-sm text-red-600"><XCircle className="size-4" /> Offline</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => teamId && checkConnection(teamId, config.instance_name)}>
                    <RefreshCw className="size-4 mr-2" /> Testar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="size-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
              {status === "connected" && mainInstance && (
                <div className={`text-sm ${mainInstanceStatus === "open" ? "text-green-600" : mainInstanceStatus === "connecting" ? "text-yellow-600" : "text-red-600"}`}>
                  {instanceStatusLabel}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Documentação</CardTitle></CardHeader>
            <CardContent>
              <Button variant="link" className="p-0 h-auto" asChild>
                <a href="https://doc.evolution-api.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  Documentação Oficial <ExternalLink className="size-3" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Instâncias</CardTitle>
                <CardDescription>Gerencie suas conexões.</CardDescription>
              </div>
              <Button size="sm" onClick={handleCreateInstance} disabled={loading || !config.api_url || !config.api_key || !config.instance_name}>
                <Plus className="size-4 mr-2" /> Criar / Conectar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {instances.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground">Nenhuma instância encontrada.</p>
                  </div>
                ) : instances.map((instance) => (
                  <div key={instance.instanceName} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{instance.instanceName}</p>
                        <p className={`text-xs ${instance.status === "open" ? "text-green-600" : instance.status === "connecting" ? "text-yellow-600" : "text-red-600"}`}>
                          {instance.status === "open" ? "Conectado" : instance.status === "connecting" ? "Aguardando QR" : instance.status === "disconnecting" ? "Desconectando" : "Desconectado"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {instance.status !== "open" ? (
                          <Button size="icon" variant="outline" title="Ver QR Code" disabled={loading} onClick={() => handleShowQrCode(instance)}>
                            <QrCode className="size-4" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="outline" className="text-orange-600 border-orange-200" title="Desconectado via Evolution" disabled>
                            <LogOut className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {activeInstanceName && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Teste de envio</p>
                        <p className="text-xs text-muted-foreground">Instância: {activeInstanceName}</p>
                      </div>
                      <Send className="size-5 text-primary" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="test_number">Número(s) — separe por vírgula</Label>
                      <Input id="test_number" placeholder="5561999999999" value={testNumber}
                        onChange={(e) => setTestNumber(e.target.value)} disabled={sendingTest} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="test_message">Mensagem</Label>
                      <Input id="test_message" value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)} disabled={sendingTest} />
                    </div>
                    <Button className="w-full" onClick={() => handleSendTest(activeInstanceName)}
                      disabled={sendingTest || !testNumber || !testMessage}>
                      <Send className="size-4 mr-2" />
                      {sendingTest ? (batchStatus ? `Enviando ${batchStatus.current}/${batchStatus.total}` : "Enviando...") : "Enviar teste"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2 rounded-lg border p-4">
                <Label htmlFor="pairing_phone">Conectar por código de pareamento</Label>
                <Input id="pairing_phone" placeholder="5561996757585" value={pairingPhone}
                  onChange={(e) => setPairingPhone(e.target.value)} />
                <p className="text-xs text-muted-foreground">Opcional: preencha antes de gerar o QR para receber código numérico.</p>
              </div>

              {(qrCode || qrCodeText || pairingCode) && (
                <div className="mt-6 flex flex-col items-center p-6 border rounded-lg bg-white">
                  {(qrCode || qrCodeText) && (
                    <>
                      <p className="text-sm font-medium mb-4 text-black">Escaneie no seu WhatsApp</p>
                      {qrCode ? (
                        <img src={qrCode} alt="WhatsApp QR Code" className="size-64" />
                      ) : (
                        <QRCodeSVG value={qrCodeText!} size={256} />
                      )}
                    </>
                  )}
                  {pairingCode && (
                    <div className="mt-4 flex flex-col items-center gap-2 text-black">
                      <p className="text-sm font-medium">Ou código de pareamento:</p>
                      <p className="rounded border px-4 py-2 font-mono text-xl tracking-widest">{pairingCode}</p>
                      <p className="max-w-xs text-center text-xs text-muted-foreground">
                        WhatsApp → Aparelhos conectados → Conectar com número → digite o código.
                      </p>
                    </div>
                  )}
                  <Button variant="link" size="sm" className="mt-4 text-black"
                    onClick={() => { setQrCode(null); setQrCodeText(null); setPairingCode(null); }}>
                    Fechar
                  </Button>
                </div>
              )}

              {qrCodeIssue && (
                <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <p className="font-medium">QR Code não disponível</p>
                  <p className="mt-1">{qrCodeIssue}</p>
                </div>
              )}

              {lastQrAttemptLog && (
                <div className="mt-6 space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Log da última tentativa</p>
                      <p className="text-xs text-muted-foreground">Use isto para diagnosticar.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleCopyLastQrLog}>
                      <Copy className="mr-2 size-4" /> Copiar
                    </Button>
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-words">
                    {lastQrAttemptLog}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
