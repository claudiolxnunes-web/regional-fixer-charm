import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImportDialog } from "@/components/ImportDialog";
import { FileSpreadsheet, Users, Building2, Package, ShoppingCart, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/importacao")({ component: ImportacaoPage });

function ImportacaoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importações</h1>
        <p className="text-sm text-muted-foreground">
          Importe planilhas Excel ou arquivos diversos para alimentar a base de dados.
        </p>
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
                codigo: "REP001",
                nome: "João da Silva",
                empresa: "Representações ABC Ltda",
                cnpj: "00.000.000/0000-00",
                cidade_sede: "Uberaba",
                regiao: "Triângulo Mineiro",
                estado: "MG",
                email: "joao@email.com",
                telefone: "(34) 99999-0000",
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
          description="Fazendas, fábricas de ração e revendas com vínculo ao representante."
          action={
            <ImportDialog
              triggerLabel="Importar Excel"
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
                codigo: "PRD001",
                nome: "Núcleo Mineral 80",
                linha: "Nutrição Ruminantes",
                solucao: "Cria",
                subsolucao: "Bezerros",
                grupo: "Núcleos",
                preco_base: 450.0,
                unidade: "SC",
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
          icon={<ShoppingCart className="size-5" />}
          title="Vendas"
          description="Em breve — análise por IA para mapear colunas automaticamente."
          action={
            <Button variant="outline" disabled>
              <Upload className="size-4 mr-2" /> Em breve
            </Button>
          }
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

      <Card className="p-5 bg-muted/30">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="size-5 text-primary mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Como funciona a importação Excel</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Use o botão <strong>Modelo</strong> dentro de cada importação para baixar um template com as colunas esperadas.</li>
              <li>O sistema é tolerante a acentuação e maiúsculas/minúsculas nos nomes das colunas.</li>
              <li>Registros com mesmo código são <strong>atualizados</strong> automaticamente (não duplicam).</li>
              <li>Antes de gravar, você vê uma pré-visualização e os avisos de linhas inválidas.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
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
