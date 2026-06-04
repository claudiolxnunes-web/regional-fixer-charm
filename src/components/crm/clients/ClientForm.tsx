import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Field } from "@/components/crm/Field";
import { ClientSalesTab } from "./ClientSalesTab";
import { ClientActivitiesTab } from "./ClientActivitiesTab";
import { ClientNutritionTab } from "./ClientNutritionTab";
import type { Client } from "@/types/crm";

interface ClientFormProps {
  editing: Client | null;
  onClose: () => void;
  onSave: (payload: Partial<Client>, id?: string) => Promise<void>;
  isSaving: boolean;
}

export function ClientForm({ editing, onClose, onSave, isSaving }: ClientFormProps) {
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
    representative_id: editing?.representative_id ?? "",
  });

  const { data: reps = [] } = useQuery({
    queryKey: ["reps-min"],
    queryFn: async () => (await supabase.from("representatives").select("id, name").order("name")).data ?? [],
  });

  const handleSave = async () => {
    const payload = { 
      ...form, 
      abc_class: form.abc_class || null, 
      total_purchases: Number(form.total_purchases) || 0,
      representative_id: form.representative_id || null
    };
    await onSave(payload as any, editing?.id);
    onClose();
  };

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
          <TabsTrigger value="nutricao" disabled={!editing}>Nutrição/Ciclos</TabsTrigger>
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
            <Field label="Representante">
              <Select value={form.representative_id || "none"} onValueChange={(v) => setForm({ ...form, representative_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem representante</SelectItem>
                  {reps.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.name}>{isSaving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </TabsContent>

        <TabsContent value="vendas">
          {editing && <ClientSalesTab clientId={editing.id} />}
        </TabsContent>

        <TabsContent value="nutricao">
          {editing && <ClientNutritionTab clientId={editing.id} />}
        </TabsContent>

        <TabsContent value="atividades">
          {editing && <ClientActivitiesTab clientId={editing.id} />}
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}
