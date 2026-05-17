import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ImportDialog } from "@/components/ImportDialog";
import { RepBreakdownDialog } from "@/components/RepBreakdownDialog";
import { useRepresentatives } from "@/hooks/useRepresentatives";
import { RepForm } from "@/components/crm/reps/RepForm";
import { InviteButton } from "@/components/crm/reps/InviteButton";
import { formatCurrency } from "@/utils/formatters";
import type { Representative } from "@/types/crm";

export const Route = createFileRoute("/_app/representantes")({ component: RepsPage });

function RepsPage() {
  const { isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Representative | null>(null);

  const { reps, isLoading, deleteRep, saveRep, isSaving } = useRepresentatives();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UserCog className="size-6 text-primary" /> Representantes
          </h1>
          <p className="text-sm text-muted-foreground">{reps.length} cadastrados</p>
        </div>
        {isStaff && (
          <InviteButton />
        )}
        {isStaff && (
          <div className="flex gap-2">
            <ImportDialog
              table="representatives"
              invalidateKey="reps"
              title="Importar representantes"
              matchBy="rep_code"
              templateSample={{
                codigo: "REP001",
                nome: "João Silva",
                empresa: "Acme Representações",
                cnpj: "00.000.000/0000-00",
                cidade: "São Paulo",
                estado: "SP",
                regiao: "Sudeste",
                email: "rep@email.com",
                telefone: "(11) 99999-0000",
              }}
              columns={[
                { header: "codigo", field: "rep_code", required: true },
                { header: "nome", field: "name", required: true },
                { header: "empresa", field: "company" },
                { header: "cnpj", field: "company_cnpj" },
                { header: "cidade", field: "home_city" },
                { header: "estado", field: "home_state", transform: (v) => String(v ?? "").toUpperCase().slice(0, 2) || null },
                { header: "regiao", field: "territory" },
                { header: "email", field: "email" },
                { header: "telefone", field: "phone" },
              ]}
              autoDetect={async () => {
                const { data: refs } = await supabase.from("clients").select("representative_id").not("representative_id", "is", null);
                const { data: existing } = await supabase.from("representatives").select("id");
                const existingIds = new Set((existing ?? []).map((r) => r.id));
                const missing = Array.from(new Set((refs ?? []).map((r) => r.representative_id))).filter((id) => id && !existingIds.has(id as string));
                return missing.map((id) => ({ id, name: "Representante sem cadastro", rep_code: `AUTO-${String(id).slice(0, 6)}`, status: "active" }));
              }}
            />
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}><Plus className="size-4 mr-2" /> Novo</Button>
              </DialogTrigger>
              <RepForm 
                key={editing?.id ?? "new"} 
                editing={editing} 
                onClose={() => setOpen(false)} 
                onSave={(payload, id) => saveRep({ payload, id })}
                isSaving={isSaving}
              />
            </Dialog>
          </div>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3">Código</th><th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Empresa</th>
                <th className="text-left p-3">Cidade/UF</th>
                <th className="text-left p-3">Status</th><th className="text-right p-3">Vendas</th>
                <th className="text-right p-3">Clientes</th><th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && reps.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum representante cadastrado</td></tr>}
              {reps.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { if (isStaff) { setEditing(r); setOpen(true); } }}>
                  <td className="p-3 font-mono text-xs">{r.rep_code || "-"}</td>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.company || "-"}</td>
                  <td className="p-3">{[r.home_city, r.home_state].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="p-3"><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></td>
                  <td className="p-3 text-right">{formatCurrency(r.total_sales)}</td>
                  <td className="p-3 text-right">{r.total_clients ?? 0}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button asChild size="sm" variant="ghost"><Link to="/representantes/$id" params={{ id: r.id }}>Detalhes</Link></Button>
                    <RepBreakdownDialog repCode={r.rep_code} repName={r.name} showMargins={isStaff} />
                    {isStaff && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="size-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir?")) deleteRep(r.id); }}><Trash2 className="size-4 text-destructive" /></Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
