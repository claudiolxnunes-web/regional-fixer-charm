import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Representative } from "@/types/crm";

interface RepFormProps {
  editing: Representative | null;
  onClose: () => void;
  onSave: (payload: Partial<Representative>, id?: string) => Promise<void>;
  isSaving: boolean;
}

export function RepForm({ editing, onClose, onSave, isSaving }: RepFormProps) {
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

  const handleSave = async () => {
    await onSave(form as any, editing?.id);
    onClose();
  };

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
        <Button onClick={handleSave} disabled={isSaving || !form.name}>{isSaving ? "Salvando..." : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
