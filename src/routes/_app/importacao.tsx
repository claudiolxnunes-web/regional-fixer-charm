import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImportDialog } from "@/components/ImportDialog";
import { GoalsImportDialog } from "@/components/GoalsImportDialog";
import { FileSpreadsheet, Users, Building2, Package, ShoppingCart, Upload, FileText, TrendingUp, Trash2, AlertTriangle, Target, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/importacao")({ component: ImportacaoPage });

const parseDate = (v: any) => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  // Excel serial date
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
};
const num = (v: any) => (v == null || v === "" ? null : Number(String(v).replace(",", ".")) || 0);
const txt = (v: any) => (v == null ? null : String(v).trim() || null);

function ImportacaoPage() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries();
      await qc.refetchQueries({ type: "active" });
      toast.success("Informações atualizadas em todas as abas");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao atualizar");
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Importações</h1>
          <p className="text-sm text-muted-foreground">
            Importe planilhas Excel ou arquivos diversos para alimentar a base de dados.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`size-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar todas as abas
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ImportCard
          icon={<Users className="size-5" />}
          title="Representantes"
          description="Cadastro de RTVs com código, empresa, região e contato."
          action={
            <ImportDialog
              triggerLabel="Importar Excel"
              table="representatives"
              invalidateKey="representatives"
              title="Importar representantes"
              matchBy="rep_code"
              templateSample={{
                codigo: "REP001", nome: "João da Silva", empresa: "Representações ABC Ltda",
                cnpj: "00.000.000/0000-00", cidade_sede: "Uberaba", regiao: "Triângulo Mineiro",
                estado: "MG", email: "joao@email.com", telefone: "(34) 99999-0000",
              }}
              columns={[
                { header: "codigo", field: "rep_code", required: true },
                { header: "nome", field: "name", required: true },
                { header: "empresa", field: "company" },
                { header: "cnpj", field: "company_cnpj" },
                { header: "cidade_sede", field: "home_city" },
                { header: "regiao", field: "territory" },
                { header: "estado", field: "home_state", transform: (v) => String(v ?? "").toUpperCase().slice(0, 2) || null },
                { header: "email", field: "email" },
                { header: "telefone", field: "phone" },
              ]}
            />
          }
        />

        <ImportCard
          icon={<Building2 className="size-5" />}
          title="Clientes"
          description="Fazendas, fábricas de ração e revendas. Deduplicação por código do cliente."
          action={
            <ImportDialog
              triggerLabel="Importar Excel"
              table="clients"
              invalidateKey="clients"
              title="Importar clientes"
              matchBy="client_code"
              templateSample={{
                codigo: "CLI001", nome: "Fazenda Boa Vista", cnpj: "00.000.000/0000-00",
                tipo: "fazenda_ruminantes", cidade: "Uberaba", estado: "MG",
                segmento: "Bovino de corte", email: "contato@email.com", telefone: "(34) 99999-0000",
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
          }
        />

        <ImportCard
          icon={<Package className="size-5" />}
          title="Produtos"
          description="Catálogo de produtos por linha, solução e grupo."
          action={
            <ImportDialog
              triggerLabel="Importar Excel"
              table="products"
              invalidateKey="products"
              title="Importar produtos"
              matchBy="product_code"
              templateSample={{
                codigo: "PRD001", nome: "Núcleo Mineral 80", linha: "Nutrição Ruminantes",
                solucao: "Cria", subsolucao: "Bezerros", grupo: "Núcleos",
                preco_base: 450.0, unidade: "SC",
              }}
              columns={[
                { header: "codigo", field: "product_code", required: true },
                { header: "nome", field: "name", required: true },
                { header: "linha", field: "line" },
                { header: "solucao", field: "solution" },
                { header: "subsolucao", field: "subsolution" },
                { header: "grupo", field: "product_group" },
                { header: "preco_base", field: "base_price", transform: (v) => Number(v) || 0 },
                { header: "unidade", field: "unit" },
              ]}
            />
          }
        />

        <ImportCard
          icon={<TrendingUp className="size-5" />}
          title="Vendas (Faturamento)"
          description="Histórico de NFs. Deduplicação por NF + Pedido + Produto. Use o layout do Export padrão."
          action={
            <ImportDialog
              triggerLabel="Importar Excel"
              table="sales"
              invalidateKey="sales_all"
              title="Importar vendas / faturamento"
              matchBy="invoice_number,product_code,order_number"
              templateSample={{
                "Data da NF": "01/05/2026", "Data do Pedido": "20/04/2026",
                "Nota Fiscal": "000001234", "Pedido": "001234",
                "Cód. Cliente": "043396", "Nome do Cliente": "Fazenda Exemplo",
                "Cód. Produto": "1683001", "Nome do Produto": "TECNOBOV PASTO HD",
                "Qtde. Sacos": 60, "Faturamento Realizado": 10777.24,
                "Cód. RC": "001262", "Representante": "REP EXEMPLO", "Linha": "NUTRICAO RUMINANTES",
              }}
              columns={[
                { header: "Data da NF", field: "invoice_date", transform: parseDate },
                { header: "Data do Pedido", field: "order_date", transform: parseDate },
                { header: "Cód Grupo", field: "group_code", transform: txt },
                { header: "Grupo Cliente", field: "client_group", transform: txt },
                { header: "Nota Fiscal", field: "invoice_number", required: true, transform: txt },
                { header: "Pedido", field: "order_number", required: true, transform: txt },
                { header: "Cód. Cliente", field: "client_code", transform: txt },
                { header: "Nome do Cliente", field: "client_name", transform: txt },
                { header: "Segmentação", field: "segmentation", transform: txt },
                { header: "Categoria", field: "category", transform: txt },
                { header: "Cód. Produto", field: "product_code", required: true, transform: txt },
                { header: "Nome do Produto", field: "product_name", transform: txt },
                { header: "Qtde. Sacos", field: "qty_bags", transform: num },
                { header: "Preço por Saco", field: "price_per_bag", transform: num },
                { header: "Preço por KG", field: "price_per_kg", transform: num },
                { header: "PMR", field: "pmr", transform: num },
                { header: "Desconto %", field: "discount_pct", transform: num },
                { header: "Município", field: "city", transform: txt },
                { header: "UF", field: "state", transform: txt },
                { header: "Região", field: "region", transform: txt },
                { header: "Cód. RC", field: "rep_code", transform: txt },
                { header: "Representante", field: "representative", transform: txt },
                { header: "Tipo de Operação", field: "operation_type", transform: txt },
                { header: "Cód. Filial", field: "branch_code", transform: txt },
                { header: "Grupo Produto", field: "product_group", transform: txt },
                { header: "Faturamento Realizado", field: "revenue", transform: num },
                { header: "Faturamento S/ Encargos", field: "revenue_no_charges", transform: num },
                { header: "MB CB %", field: "mb_cb_pct", transform: num },
                { header: "MB CB Total", field: "mb_cb_total", transform: num },
                { header: "ML CB % (Estimada)", field: "ml_cb_pct", transform: num },
                { header: "ML CB Total (Estimada)", field: "ml_cb_total", transform: num },
                { header: "Volume (Vendas)", field: "volume_sales", transform: num },
                { header: "Volume (Vendas + Bon.)", field: "volume_sales_bonus", transform: num },
                { header: "Bonificação", field: "bonus", transform: num },
                { header: "ICMS Total", field: "icms_total", transform: num },
                { header: "PIS Total", field: "pis_total", transform: num },
                { header: "Cofins Total", field: "cofins_total", transform: num },
                { header: "Custo Brill Total", field: "cost_total", transform: num },
                { header: "Desp Comercial", field: "commercial_expense", transform: num },
                { header: "Frete Carga Realizado", field: "freight", transform: num },
                { header: "Volume (Convertido)", field: "volume_converted", transform: num },
                { header: "Customizado", field: "customized", transform: txt },
                { header: "Cód Grupo Produto", field: "product_group_code", transform: txt },
                { header: "Solução", field: "solution", transform: txt },
                { header: "Subsolução", field: "subsolution", transform: txt },
                { header: "Linha", field: "line", transform: txt },
                { header: "GRV", field: "grv", transform: txt },
                { header: "GNV", field: "gnv", transform: txt },
                { header: "Mês/Ano", field: "month_year", transform: txt },
                { header: "Filial", field: "branch", transform: txt },
                { header: "Cód CFOP", field: "cfop", transform: txt },
                { header: "FL_VEF", field: "fl_vef", transform: txt },
                { header: "Comissão Realizado %", field: "commission_pct", transform: num },
                { header: "Comissão Realizado", field: "commission_value", transform: num },
                { header: "Moeda Pedido", field: "currency", transform: txt },
                { header: "Ano", field: "year", transform: (v) => v ? Number(v) : null },
              ]}
            />
          }
        />

        <ImportCard
          icon={<ShoppingCart className="size-5" />}
          title="Pedidos em Aberto"
          description="Snapshot da carteira: ao importar, substitui completamente a foto anterior (apaga tudo e insere a nova)."
          action={
            <ImportDialog
              triggerLabel="Importar Snapshot"
              table="open_orders"
              invalidateKey="open_orders"
              title="Importar pedidos em aberto (snapshot)"
              snapshot
              templateSample={{
                "Status Tracking": "1. Bloqueado", "Filial": "010057", "Pedido": "012139",
                "Cód Cliente": "055538", "Cliente": "Cliente Exemplo",
                "Cód. Produto": "1688457", "Produto": "TECNOCORTE PASTO HD",
                "Pedido Valor": 5615.72, "Pedido Volume": 750,
              }}
              columns={[
                { header: "Status Tracking", field: "status_tracking", transform: txt },
                { header: "Filial", field: "branch_code", transform: txt },
                { header: "Pedido", field: "order_number", required: true, transform: txt },
                { header: "Pedido Green", field: "green_order", transform: txt },
                { header: "Pré Carga", field: "pre_load", transform: txt },
                { header: "Carga", field: "load_id", transform: txt },
                { header: "Inclusão do Pedido", field: "order_inclusion_date", transform: parseDate },
                { header: "Prev. Fat. Solicitada", field: "forecast_billing_requested", transform: parseDate },
                { header: "Prev. Fat. Real", field: "forecast_billing_real", transform: parseDate },
                { header: "Faturamento Real", field: "billing_real", transform: parseDate },
                { header: "Entrega Solicitada", field: "delivery_requested", transform: parseDate },
                { header: "Entrega Real", field: "delivery_real", transform: parseDate },
                { header: "Bloqueio", field: "block_type", transform: txt },
                { header: "Motivo Bloqueio Financeiro", field: "financial_block_reason", transform: txt },
                { header: "Motivo Bloqueio Prescrição", field: "prescription_block_reason", transform: txt },
                { header: "Diretoria", field: "director", transform: txt },
                { header: "GEV", field: "gev", transform: txt },
                { header: "GRV", field: "grv", transform: txt },
                { header: "Cód ERC", field: "erc_code", transform: txt },
                { header: "ERC", field: "erc", transform: txt },
                { header: "Cód Cliente", field: "client_code", transform: txt },
                { header: "Cliente", field: "client_name", transform: txt },
                { header: "Categoria", field: "category", transform: txt },
                { header: "Seg.", field: "segment", transform: txt },
                { header: "Linha", field: "line", transform: txt },
                { header: "Cód. Produto", field: "product_code", required: true, transform: txt },
                { header: "Produto", field: "product_name", transform: txt },
                { header: "OC", field: "oc", transform: txt },
                { header: "Motorista", field: "driver", transform: txt },
                { header: "DDD", field: "ddd", transform: txt },
                { header: "Tel Motorista", field: "driver_phone", transform: txt },
                { header: "Pedido Valor", field: "order_value", transform: num },
                { header: "Pedido Volume", field: "order_volume", transform: num },
                { header: "É VEF?", field: "is_vef", transform: txt },
              ]}
            />
          }
        />

        <ImportCard
          icon={<Target className="size-5" />}
          title="Metas (FAT x VOL)"
          description="Metas anuais por representante, mês, linha, solução e subsolução. Substitui o ano ao reimportar."
          action={<GoalsImportDialog />}
        />

        <Card className="p-5 border-dashed flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted text-muted-foreground"><FileText className="size-5" /></div>
            <div>
              <h3 className="font-medium">Outros arquivos</h3>
              <Badge variant="secondary" className="mt-1">Genérico</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex-1">
            Envie planilhas, PDFs, imagens ou documentos diversos para arquivamento.
          </p>
          <GenericUpload />
        </Card>
      </div>

      <DangerZone />

      <Card className="p-5 bg-muted/30">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="size-5 text-primary mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Como funciona</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Use o botão <strong>Modelo</strong> dentro de cada importação para baixar o template com as colunas esperadas.</li>
              <li>Pode reimportar o arquivo inteiro: <strong>vendas</strong> deduplica por NF+Pedido+Produto e <strong>pedidos</strong> deduplica por Pedido+Produto.</li>
              <li>O sistema é tolerante a acentuação e maiúsculas/minúsculas nos nomes das colunas.</li>
              <li>Antes de gravar, você vê pré-visualização e avisos de linhas inválidas.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DangerZone() {
  const qc = useQueryClient();
  const wipe = useMutation({
    mutationFn: async (table: "sales" | "open_orders" | "clients" | "all") => {
      const targets = table === "all" ? ["sales", "open_orders", "clients"] : [table];
      for (const t of targets) {
        const { error } = await (supabase as any).from(t).delete().not("id", "is", null);
        if (error) throw error;
      }
    },
    onSuccess: (_d, table) => {
      toast.success(table === "all" ? "Base zerada" : `Tabela ${table} esvaziada`);
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ask = (label: string, table: "sales" | "open_orders" | "clients" | "all") => {
    if (confirm(`Tem certeza que deseja apagar TODOS os registros de ${label}? Esta ação não pode ser desfeita.`)) {
      wipe.mutate(table);
    }
  };

  return (
    <Card className="p-5 border-destructive/30 bg-destructive/5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 text-destructive mt-0.5" />
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-medium text-destructive">Zona de perigo — limpar base</h3>
            <p className="text-sm text-muted-foreground">
              Use para apagar dados importados antes de uma nova carga limpa. A ação é irreversível.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => ask("Vendas", "sales")} disabled={wipe.isPending}>
              <Trash2 className="size-4 mr-1.5" /> Limpar Vendas
            </Button>
            <Button variant="outline" size="sm" onClick={() => ask("Carteira de Pedidos", "open_orders")} disabled={wipe.isPending}>
              <Trash2 className="size-4 mr-1.5" /> Limpar Pedidos
            </Button>
            <Button variant="outline" size="sm" onClick={() => ask("Clientes", "clients")} disabled={wipe.isPending}>
              <Trash2 className="size-4 mr-1.5" /> Limpar Clientes
            </Button>
            <Button variant="destructive" size="sm" onClick={() => ask("toda a base (clientes + vendas + pedidos)", "all")} disabled={wipe.isPending}>
              <Trash2 className="size-4 mr-1.5" /> Limpar TUDO
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ImportCard({
  icon, title, description, action,
}: { icon: React.ReactNode; title: string; description: string; action: React.ReactNode }) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground flex-1">{description}</p>
      <div>{action}</div>
    </Card>
  );
}

function GenericUpload() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="space-y-2">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:text-secondary-foreground file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-secondary/80"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={!file}
        onClick={() => toast.info("Armazenamento de arquivos genéricos será habilitado em breve.")}
      >
        <Upload className="size-3.5 mr-1.5" /> Enviar
      </Button>
    </div>
  );
}
