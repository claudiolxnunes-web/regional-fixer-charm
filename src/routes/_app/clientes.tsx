import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ImportDialog } from "@/components/ImportDialog";

export const Route = createFileRoute("/_app/clientes")({ component: ClientesPage });

type Client = {
  id: string;
  client_code: string | null;
  name: string;
  type: "fazenda_ruminantes" | "fabrica_racao" | "revenda_agropecuaria";
  cnpj: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  status: "active" | "inactive" | "prospect" | null;
  effective_status?: "active" | "inactive" | "prospect" | null;
  days_since_last_purchase?: number | null;
  last_purchase_date?: string | null;
  abc_class: string | null;
  total_purchases: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo (>6m)",
  prospect: "Prospect",
};

const TYPE_LABEL: Record<string, string> = {
  fazenda_ruminantes: "Fazenda",
  fabrica_racao: "Fábrica de Ração",
  revenda_agropecuaria: "Revenda",
};

function ClientesPage() {
  const qc = useQueryClient();
  const { isStaff } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clients_view").select("*").order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = clients.filter((c) =>
    [c.name, c.client_code, c.city, c.cnpj].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clients.length} cadastrados</p>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <ImportDialog
              table="clients"
              invalidateKey="clients"
              title="Importar clientes"
              matchBy="client_code"
              templateSample={{
                codigo: "CLI001",
                nome: "Fazenda Boa Vista",
                cnpj: "00.000.000/0000-00",
                tipo: "fazenda_ruminantes",
                cidade: "Uberaba",
                estado: "MG",
                segmento: "Bovino de corte",
                email: "contato@email.com",
                telefone: "(34) 99999-0000",
              }}
              columns={[
                { header: "codigo", field: "client_code", required: true },
                { header: "nome", field: "name", required: true },
                { header: "cnpj", field: "cnpj" },
                { header: "tipo", field: "type", transform: (v) => {
                  const s = String(v ?? "").toLowerCase();
                  if (s.includes("fabrica") || s.includes("racao")) return "fabrica_racao";
                  if (s.includes("revenda") || s.includes("agropec")) return "revenda_agropecuaria";
                  return "fazenda_ruminantes";
                } },
                { header: "cidade", field: "city" },
                { header: "estado", field: "state", transform: (v) => String(v ?? "").toUpperCase().slice(0, 2) || null },
                { header: "segmento", field: "segment" },
                { header: "email", field: "email" },
                { header: "telefone", field: "phone" },
              ]}
            />
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}><Plus className="size-4 mr-2" /> Novo cliente</Button>
              </DialogTrigger>
              <ClientForm key={editing?.id ?? "new"} editing={editing} onClose={() => setOpen(false)} />
            </Dialog>
          </div>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome, código, cidade..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Código</th>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Cidade/UF</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">ABC</th>
                <th className="text-right p-3 font-medium">Compras</th>
                {isStaff && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum cliente encontrado</td></tr>}
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { setEditing(c); setOpen(true); }}>
                  <td className="p-3 font-mono text-xs">{c.client_code || "-"}</td>
                  <td className="p-3 font-medium text-primary hover:underline">{c.name}</td>
                  <td className="p-3">{TYPE_LABEL[c.type]}</td>
                  <td className="p-3">{[c.city, c.state].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="p-3"><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status ?? "-"}</Badge></td>
                  <td className="p-3">{c.abc_class && <Badge variant="outline">{c.abc_class}</Badge>}</td>
                  <td className="p-3 text-right">R$ {Number(c.total_purchases ?? 0).toLocaleString("pt-BR")}</td>
                  {isStaff && (
                    <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir este cliente?")) del.mutate(c.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ClientForm({ editing, onClose }: { editing: Client | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_code: editing?.client_code ?? "",
    name: editing?.name ?? "",
    type: editing?.type ?? "fazenda_ruminantes",
    cnpj: editing?.cnpj ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    city: editing?.city ?? "",
    state: editing?.state ?? "",
    status: editing?.status ?? "active",
    abc_class: editing?.abc_class ?? "",
    total_purchases: editing?.total_purchases ?? 0,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, abc_class: form.abc_class || null, total_purchases: Number(form.total_purchases) || 0 };
      if (editing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>
          {editing ? editing.name : "Novo cliente"}
          {editing?.client_code && <span className="ml-2 font-mono text-xs text-muted-foreground">#{editing.client_code}</span>}
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="vendas" disabled={!editing}>Vendas</TabsTrigger>
          <TabsTrigger value="atividades" disabled={!editing}>Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código"><Input value={form.client_code} onChange={(e) => setForm({ ...form, client_code: e.target.value })} /></Field>
            <Field label="CNPJ"><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></Field>
            <Field label="Nome" full><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Tipo">
              <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fazenda_ruminantes">Fazenda de Ruminantes</SelectItem>
                  <SelectItem value="fabrica_racao">Fábrica de Ração</SelectItem>
                  <SelectItem value="revenda_agropecuaria">Revenda Agropecuária</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status as string} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Cidade"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <Field label="UF"><Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} /></Field>
            <Field label="Classe ABC">
              <Select value={form.abc_class || "none"} onValueChange={(v) => setForm({ ...form, abc_class: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Total de compras (R$)"><Input type="number" value={form.total_purchases} onChange={(e) => setForm({ ...form, total_purchases: Number(e.target.value) })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </TabsContent>

        <TabsContent value="vendas">
          {editing && <ClientSalesTab clientId={editing.id} />}
        </TabsContent>

        <TabsContent value="atividades">
          {editing && <ClientActivitiesTab clientId={editing.id} />}
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

function ClientSalesTab({ clientId: _clientId }: { clientId: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground space-y-2">
      <p className="font-medium text-foreground">Vendas ainda não importadas</p>
      <p>Assim que o modelo de vendas for carregado, este painel mostrará o histórico do cliente
      classificado por linha (Nutrição Ruminantes, Revenda Ruminantes, Aditivos), com totais por período.</p>
    </div>
  );
}

function ClientActivitiesTab({ clientId }: { clientId: string }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["client_activities", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, title, type, status, scheduled_at, completed_at, outcome")
        .eq("client_id", clientId)
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>;
  if (!activities.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada para este cliente.</p>;

  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
          <tr>
            <th className="text-left p-2 font-medium">Data</th>
            <th className="text-left p-2 font-medium">Título</th>
            <th className="text-left p-2 font-medium">Tipo</th>
            <th className="text-left p-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a: any) => (
            <tr key={a.id} className="border-t">
              <td className="p-2 whitespace-nowrap text-xs">{a.scheduled_at ? new Date(a.scheduled_at).toLocaleDateString("pt-BR") : "-"}</td>
              <td className="p-2">{a.title}</td>
              <td className="p-2 text-xs">{a.type}</td>
              <td className="p-2"><Badge variant="outline" className="text-xs">{a.status ?? "-"}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
