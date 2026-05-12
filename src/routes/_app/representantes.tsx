import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ImportDialog } from "@/components/ImportDialog";
import { RepBreakdownDialog } from "@/components/RepBreakdownDialog";

export const Route = createFileRoute("/_app/representantes")({ component: RepsPage });

type Rep = {
  id: string;
  rep_code: string | null;
  name: string;
  company: string | null;
  company_cnpj: string | null;
  email: string | null;
  phone: string | null;
  status: "active" | "inactive";
  total_sales: number | null;
  total_clients: number | null;
  home_state: string | null;
  home_city: string | null;
};

function RepsPage() {
  const qc = useQueryClient();
  const { isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rep | null>(null);

  const { data: reps = [], isLoading } = useQuery({
    queryKey: ["reps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("representatives").select("*").order("name");
      if (error) throw error;
      return data as Rep[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("representatives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reps"] }); toast.success("Removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Representantes</h1>
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
                // Find rep IDs referenced by clients but missing in representatives
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
              <RepForm key={editing?.id ?? "new"} editing={editing} onClose={() => setOpen(false)} />
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
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.rep_code || "-"}</td>
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.company || "-"}</td>
                  <td className="p-3">{[r.home_city, r.home_state].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="p-3"><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></td>
                  <td className="p-3 text-right">R$ {Number(r.total_sales ?? 0).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-right">{r.total_clients ?? 0}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button asChild size="sm" variant="ghost"><Link to="/representantes/$id" params={{ id: r.id }}>Detalhes</Link></Button>
                    <RepBreakdownDialog repCode={r.rep_code} repName={r.name} showMargins={isStaff} />
                    {isStaff && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="size-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir?")) del.mutate(r.id); }}><Trash2 className="size-4 text-destructive" /></Button>
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

function RepForm({ editing, onClose }: { editing: Rep | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    rep_code: editing?.rep_code ?? "",
    name: editing?.name ?? "",
    company: editing?.company ?? "",
    company_cnpj: editing?.company_cnpj ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    home_city: editing?.home_city ?? "",
    home_state: editing?.home_state ?? "",
    status: editing?.status ?? "active",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("representatives").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("representatives").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reps"] }); toast.success("Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} representante</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs">Código</Label><Input value={form.rep_code} onChange={(e) => setForm({ ...form, rep_code: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="space-y-1.5"><Label className="text-xs">Empresa de representação</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">CNPJ da empresa</Label><Input value={form.company_cnpj} onChange={(e) => setForm({ ...form, company_cnpj: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Cidade sede</Label><Input value={form.home_city} onChange={(e) => setForm({ ...form, home_city: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">UF sede</Label><Input maxLength={2} value={form.home_state} onChange={(e) => setForm({ ...form, home_state: e.target.value.toUpperCase() })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function InviteButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "rep">("rep");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!user) return;
    setLoading(true);
    try {
      const { data: tm } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!tm?.team_id) throw new Error("Sem time associado");
      const { sendInviteWithTeam } = await import("@/lib/email.functions");
      await sendInviteWithTeam({ data: { email, role, teamId: tm.team_id, createdBy: user.id } });
      toast.success("Convite enviado!");
      setOpen(false);
      setEmail("");
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="size-4 mr-2" /> Convidar por email</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Convidar membro</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <Label>Função</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rep">Representante</SelectItem>
                <SelectItem value="manager">Gestor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={send} disabled={loading || !email}>Enviar convite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
