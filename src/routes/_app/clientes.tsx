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
import { Plus, Search, Pencil, Trash2, Layers } from "lucide-react";
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
  abc_class: string | null;
  total_purchases: number | null;
};

const TYPE_LABEL: Record<string, string> = {
  fazenda_ruminantes: "Fazenda",
  fabrica_racao: "Fábrica de Ração",
  revenda_agropecuaria: "Revenda",
};

const LINE_LABEL: Record<string, string> = {
  nutricao_ruminantes: "Nutrição Ruminantes",
  revenda_ruminantes: "Revenda Ruminantes",
  aditivos: "Aditivos",
  indefinido: "Indefinido",
};
const LINE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  nutricao_ruminantes: "default",
  revenda_ruminantes: "secondary",
  aditivos: "default",
  indefinido: "outline",
};

type ClientLine = { id: string; client_id: string; line: keyof typeof LINE_LABEL; line_code: string; is_primary: boolean };

function ClientesPage() {
  const qc = useQueryClient();
  const { isStaff } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [linesFor, setLinesFor] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["client_lines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_lines" as any).select("*");
      if (error) throw error;
      return (data as unknown) as ClientLine[];
    },
  });

  const linesByClient = lines.reduce<Record<string, ClientLine[]>>((acc, l) => {
    (acc[l.client_id] ||= []).push(l);
    return acc;
  }, {});

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); toast.success("Cliente removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = clients.filter((c) => {
    const codes = (linesByClient[c.id] ?? []).map((l) => l.line_code).join(" ");
    return [c.name, c.client_code, c.city, c.cnpj, codes].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase()));
  });

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
                codigo_representante: "REP001",
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
              autoDetect={async () => {
                // Find client IDs referenced in opportunities/activities but missing
                const [{ data: opps }, { data: acts }, { data: existing }] = await Promise.all([
                  supabase.from("opportunities").select("client_id").not("client_id", "is", null),
                  supabase.from("activities").select("client_id").not("client_id", "is", null),
                  supabase.from("clients").select("id"),
                ]);
                const existingIds = new Set((existing ?? []).map((c) => c.id));
                const refs = [...(opps ?? []), ...(acts ?? [])].map((r) => r.client_id).filter(Boolean) as string[];
                const missing = Array.from(new Set(refs)).filter((id) => !existingIds.has(id));
                return missing.map((id) => ({ id, name: "Cliente sem cadastro", client_code: `AUTO-${id.slice(0, 6)}`, type: "fazenda_ruminantes", status: "prospect" }));
              }}
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
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{c.client_code || "-"}</td>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{TYPE_LABEL[c.type]}</td>
                  <td className="p-3">{[c.city, c.state].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="p-3"><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status ?? "-"}</Badge></td>
                  <td className="p-3">{c.abc_class && <Badge variant="outline">{c.abc_class}</Badge>}</td>
                  <td className="p-3 text-right">R$ {Number(c.total_purchases ?? 0).toLocaleString("pt-BR")}</td>
                  {isStaff && (
                    <td className="p-3 text-right whitespace-nowrap">
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
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
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
            </SelectContent>
          </Select>
        </Field>
        <Field label="Total de compras (R$)"><Input type="number" value={form.total_purchases} onChange={(e) => setForm({ ...form, total_purchases: Number(e.target.value) })} /></Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
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
