import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Eye, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/propostas")({ component: PropostasPage });

const fmt = (v: any) => Number(v ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
};

function PropostasPage() {
  const { isStaff } = useAuth();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["quotes_list", tab],
    queryFn: async () => {
      let q = supabase.from("quotes").select("*").order("created_at", { ascending: false });
      if (tab !== "all") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = {
    pending: rows.filter((r: any) => r.status === "pending").length,
    approved: rows.filter((r: any) => r.status === "approved").length,
    rejected: rows.filter((r: any) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Propostas / Orçamentos</h1>
        <p className="text-sm text-muted-foreground">
          {isStaff ? "Aprove ou rejeite propostas enviadas pelos representantes." : "Suas propostas enviadas."}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Clock className="size-4" />} label="Pendentes" value={counts.pending.toString()} />
        <Kpi icon={<CheckCircle2 className="size-4 text-green-600" />} label="Aprovadas" value={counts.approved.toString()} />
        <Kpi icon={<XCircle className="size-4 text-destructive" />} label="Rejeitadas" value={counts.rejected.toString()} />
        <Kpi icon={<FileText className="size-4" />} label="Total" value={rows.length.toString()} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full max-w-full overflow-x-auto justify-start">
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="approved">Aprovadas</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Itens</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-left p-3 font-medium">Validade</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && !rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma proposta encontrada</td></tr>}
              {rows.map((r: any) => {
                const items = Array.isArray(r.items) ? r.items : [];
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3">{r.client_name || "—"}</td>
                    <td className="p-3">{items.length} item(s)</td>
                    <td className="p-3 text-right font-mono">R$ {fmt(r.total)}</td>
                    <td className="p-3">{r.valid_until ? new Date(r.valid_until).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="p-3"><Badge variant={STATUS_VARIANT[r.status] || "outline"}>{STATUS_LABEL[r.status] || r.status}</Badge></td>
                    <td className="p-3">
                      <QuoteDetailDialog quote={r} canManage={isStaff} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function QuoteDetailDialog({ quote, canManage }: { quote: any; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState(quote.manager_response || "");
  const qc = useQueryClient();

  const mutate = useMutation({
    mutationFn: async (status: "approved" | "rejected") => {
      const { error } = await supabase
        .from("quotes")
        .update({
          status,
          manager_response: response || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", quote.id);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      toast.success(status === "approved" ? "Proposta aprovada" : "Proposta rejeitada");
      qc.invalidateQueries({ queryKey: ["quotes_list"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });

  const items = Array.isArray(quote.items) ? quote.items : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><Eye className="size-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proposta — {quote.client_name || "Cliente"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Info label="Status" value={<Badge variant={STATUS_VARIANT[quote.status]}>{STATUS_LABEL[quote.status]}</Badge>} />
            <Info label="Total" value={`R$ ${fmt(quote.total)}`} />
            <Info label="Validade" value={quote.valid_until ? new Date(quote.valid_until).toLocaleDateString("pt-BR") : "—"} />
            <Info label="Pagamento" value={quote.payment_terms || "—"} />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2">Itens</div>
            <Card>
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2">Produto</th>
                    <th className="text-right p-2">Qtd</th>
                    <th className="text-right p-2">Preço Unit.</th>
                    <th className="text-right p-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {!items.length && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Sem itens</td></tr>}
                  {items.map((it: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{it.product || it.name || it.product_name || "—"}</td>
                      <td className="p-2 text-right">{Number(it.qty || it.quantity || 0).toLocaleString("pt-BR")}</td>
                      <td className="p-2 text-right font-mono">R$ {fmt(it.price || it.unit_price)}</td>
                      <td className="p-2 text-right font-mono">R$ {fmt((Number(it.qty || it.quantity || 0)) * Number(it.price || it.unit_price || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {quote.notes && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Observações do representante</div>
              <Card className="p-3 text-xs whitespace-pre-wrap">{quote.notes}</Card>
            </div>
          )}

          {canManage && quote.status === "pending" ? (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Resposta ao representante (opcional)</label>
              <Textarea
                rows={3}
                placeholder="Ex: aprovado com condição X, ou motivo da rejeição..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
            </div>
          ) : quote.manager_response ? (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Resposta do gestor</div>
              <Card className="p-3 text-xs whitespace-pre-wrap">{quote.manager_response}</Card>
              {quote.responded_at && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  Respondido em {new Date(quote.responded_at).toLocaleString("pt-BR")}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {canManage && quote.status === "pending" && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={mutate.isPending}
              onClick={() => mutate.mutate("rejected")}
            >
              <XCircle className="size-4 mr-1" /> Rejeitar
            </Button>
            <Button
              disabled={mutate.isPending}
              onClick={() => mutate.mutate("approved")}
            >
              <CheckCircle2 className="size-4 mr-1" /> Aprovar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}
