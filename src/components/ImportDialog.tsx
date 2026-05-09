import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Wand2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export type ColumnMap = {
  /** Excel header name (case-insensitive, accent-insensitive) */
  header: string;
  /** Target DB column */
  field: string;
  /** Required for the row to be considered valid */
  required?: boolean;
  /** Transform value (e.g. uppercase, parse number) */
  transform?: (v: any) => any;
};

type Props = {
  triggerLabel?: string;
  table: string;
  invalidateKey: string;
  title: string;
  columns: ColumnMap[];
  /** Sample row for the template download */
  templateSample: Record<string, any>;
  /** Match-by field for upsert (e.g. "client_code", "rep_code") */
  matchBy?: string;
  /** Auto-detect handler — returns rows that can be created automatically */
  autoDetect?: () => Promise<Array<Record<string, any>>>;
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function ImportDialog({
  triggerLabel = "Importar",
  table,
  invalidateKey,
  title,
  columns,
  templateSample,
  matchBy,
  autoDetect,
}: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [autoRows, setAutoRows] = useState<Record<string, any>[] | null>(null);

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([templateSample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, `modelo-${table}.xlsx`);
  }

  async function handleFile(file: File) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });

    const headerMap = new Map<string, ColumnMap>();
    columns.forEach((c) => headerMap.set(norm(c.header), c));

    const errs: string[] = [];
    const out: Record<string, any>[] = [];
    rows.forEach((row, i) => {
      const obj: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        const col = headerMap.get(norm(String(k)));
        if (!col) continue;
        obj[col.field] = col.transform ? col.transform(v) : v;
      }
      const missing = columns.filter((c) => c.required && (obj[c.field] == null || obj[c.field] === ""));
      if (missing.length) {
        errs.push(`Linha ${i + 2}: faltando ${missing.map((m) => m.header).join(", ")}`);
      } else {
        out.push(obj);
      }
    });
    setParsed(out);
    setErrors(errs);
  }

  async function commitImport() {
    if (!parsed.length) return;
    setBusy(true);
    try {
      const tbl: any = supabase.from(table as any);
      const { error } = await (matchBy
        ? tbl.upsert(parsed, { onConflict: matchBy, ignoreDuplicates: false })
        : tbl.insert(parsed));
      if (error) throw error;
      toast.success(`${parsed.length} registro(s) importado(s)`);
      qc.invalidateQueries({ queryKey: [invalidateKey] });
      setParsed([]);
      setErrors([]);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function runAutoDetect() {
    if (!autoDetect) return;
    setBusy(true);
    try {
      const rows = await autoDetect();
      setAutoRows(rows);
      if (!rows.length) toast.info("Nada novo encontrado.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function commitAuto() {
    if (!autoRows?.length) return;
    setBusy(true);
    try {
      const q = matchBy
        ? supabase.from(table).upsert(autoRows, { onConflict: matchBy, ignoreDuplicates: true })
        : supabase.from(table).insert(autoRows);
      const { error } = await q;
      if (error) throw error;
      toast.success(`${autoRows.length} registro(s) criado(s)`);
      qc.invalidateQueries({ queryKey: [invalidateKey] });
      setAutoRows(null);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="size-4 mr-2" />{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Tabs defaultValue="excel">
          <TabsList>
            <TabsTrigger value="excel"><FileSpreadsheet className="size-4 mr-1.5" />Planilha Excel</TabsTrigger>
            <TabsTrigger value="auto" disabled={!autoDetect}><Wand2 className="size-4 mr-1.5" />Detectar automaticamente</TabsTrigger>
          </TabsList>

          <TabsContent value="excel" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Envie um arquivo .xlsx. Colunas aceitas:{" "}
                <span className="font-medium">{columns.map((c) => c.header).join(", ")}</span>
              </p>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="size-4 mr-1.5" />Modelo
              </Button>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-primary/90"
            />
            {errors.length > 0 && (
              <Card className="p-3 bg-destructive/10 border-destructive/30 max-h-40 overflow-auto">
                <p className="text-xs font-medium mb-1">Avisos:</p>
                <ul className="text-xs space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </Card>
            )}
            {parsed.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-3 border-b flex items-center justify-between">
                  <span className="text-sm">Pré-visualização: <Badge>{parsed.length}</Badge> linha(s) válida(s)</span>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>{columns.map((c) => <th key={c.field} className="text-left p-2">{c.header}</th>)}</tr>
                    </thead>
                    <tbody>
                      {parsed.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-t">
                          {columns.map((c) => <td key={c.field} className="p-2">{String(r[c.field] ?? "")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={commitImport} disabled={busy || !parsed.length}>
                Importar {parsed.length || ""}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="auto" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Varre os dados existentes (clientes, oportunidades, atividades) e identifica registros faltantes
              que podem ser criados automaticamente correlacionando código e nome.
            </p>
            <Button onClick={runAutoDetect} disabled={busy}>
              <Wand2 className="size-4 mr-2" />Procurar
            </Button>
            {autoRows && autoRows.length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-3 border-b">
                  <span className="text-sm">{autoRows.length} sugestão(ões) encontrada(s)</span>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>{Object.keys(autoRows[0]).map((k) => <th key={k} className="text-left p-2">{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {autoRows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="border-t">
                          {Object.keys(autoRows[0]).map((k) => <td key={k} className="p-2">{String(r[k] ?? "")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={commitAuto} disabled={busy || !autoRows?.length}>
                Criar {autoRows?.length || ""}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
