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
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { ImportDialog } from "@/components/ImportDialog";

export const Route = createFileRoute("/_app/produtos")({ component: ProdutosPage });

type Product = {
  id: string;
  product_code: string | null;
  name: string;
  product_group: string | null;
  line: string | null;
  solution: string | null;
  subsolution: string | null;
  base_price: number | null;
  unit: string | null;
  active: boolean;
};

function ProdutosPage() {
  const qc = useQueryClient();
  const { isStaff } = useAuth();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Produto removido"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = products.filter((p) =>
    [p.name, p.product_code, p.line, p.solution].some((v) => (v ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">{products.length} cadastrados</p>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <ImportDialog
              table="products"
              invalidateKey="products"
              title="Importar produtos"
              matchBy="product_code"
              templateSample={{
                codigo: "PRD001",
                nome: "Produto Exemplo",
                linha: "Nutrição",
                solucao: "Corte",
                preco_base: 100.0,
                unidade: "SC",
              }}
              columns={[
                { header: "codigo", field: "product_code", required: true },
                { header: "nome", field: "name", required: true },
                { header: "linha", field: "line" },
                { header: "solucao", field: "solution" },
                { header: "preco_base", field: "base_price", transform: (v) => Number(v) || 0 },
                { header: "unidade", field: "unit" },
              ]}
            />
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}><Plus className="size-4 mr-2" /> Novo produto</Button>
              </DialogTrigger>
              <ProductForm key={editing?.id ?? "new"} editing={editing} onClose={() => setOpen(false)} />
            </Dialog>
          </div>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome, código, linha..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Código</th>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Linha</th>
                <th className="text-left p-3 font-medium">Solução</th>
                <th className="text-right p-3 font-medium">Preço Base</th>
                <th className="text-center p-3 font-medium">Unidade</th>
                {isStaff && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum produto encontrado</td></tr>}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { if (isStaff) { setEditing(p); setOpen(true); } }}>
                  <td className="p-3 font-mono text-xs">{p.product_code || "-"}</td>
                  <td className="p-3 font-medium text-primary">{p.name}</td>
                  <td className="p-3">{p.line || "-"}</td>
                  <td className="p-3">{p.solution || "-"}</td>
                  <td className="p-3 text-right">R$ {Number(p.base_price ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-center">{p.unit || "-"}</td>
                  {isStaff && (
                    <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir este produto?")) del.mutate(p.id); }}><Trash2 className="size-4 text-destructive" /></Button>
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

function ProductForm({ editing, onClose }: { editing: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    product_code: editing?.product_code ?? "",
    name: editing?.name ?? "",
    line: editing?.line ?? "",
    solution: editing?.solution ?? "",
    subsolution: editing?.subsolution ?? "",
    product_group: editing?.product_group ?? "",
    base_price: editing?.base_price ?? 0,
    unit: editing?.unit ?? "SC",
    active: editing?.active ?? true,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, base_price: Number(form.base_price) || 0 };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Salvo"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
          <Label>Código</Label>
          <Input value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Unidade</Label>
          <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Ex: SC, KG, UN" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Linha</Label>
          <Input value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Solução</Label>
          <Input value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Subsolução</Label>
          <Input value={form.subsolution} onChange={(e) => setForm({ ...form, subsolution: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Preço Base</Label>
          <Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: Number(e.target.value) })} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
