import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ImportDialog } from "@/components/ImportDialog";
import { useClients } from "@/hooks/useClients";
import { ClientForm } from "@/components/crm/clients/ClientForm";
import { formatCurrency } from "@/utils/formatters";
import type { Client } from "@/types/crm";

export const Route = createFileRoute("/_app/clientes")({ component: ClientesPage });

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
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const { filtered, isLoading, deleteClient, saveClient, isSaving, clients } = useClients(q);

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
              <ClientForm 
                key={editing?.id ?? "new"} 
                editing={editing} 
                onClose={() => setOpen(false)} 
                onSave={(payload, id) => saveClient({ payload, id })}
                isSaving={isSaving}
              />
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
                <tr key={c.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { if (isStaff) { setEditing(c); setOpen(true); } else { navigate({ to: "/clientes", search: { search: c.name } }); } }}>
                  <td className="p-3 font-mono text-xs">{c.client_code || "-"}</td>
                  <td className="p-3 font-medium text-primary hover:underline">{c.name}</td>
                  <td className="p-3">{TYPE_LABEL[c.type]}</td>
                  <td className="p-3">{[c.city, c.state].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="p-3">
                    {(() => { 
                      const s = c.effective_status ?? c.status ?? "prospect"; 
                      const variant = s === "active" ? "default" : s === "prospect" ? "outline" : "secondary"; 
                      return <Badge variant={variant as any}>{STATUS_LABEL[s] ?? s}</Badge>; 
                    })()}
                  </td>
                  <td className="p-3">{c.abc_class && <Badge variant="outline">{c.abc_class}</Badge>}</td>
                  <td className="p-3 text-right">{formatCurrency(c.total_purchases)}</td>
                  {isStaff && (
                    <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir este cliente?")) deleteClient(c.id); }}><Trash2 className="size-4 text-destructive" /></Button>
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
