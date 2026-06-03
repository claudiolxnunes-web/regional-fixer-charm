import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const MONTHS = [
  "JANEIRO","FEVEREIRO","MARCO","ABRIL","MAIO","JUNHO",
  "JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO",
];
const norm = (s: any) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const num = (v: any) => (v == null || v === "" ? 0 : Number(v) || 0);

type Row = {
  representative_code: string;
  representative_name: string;
  year: number;
  month: number;
  line: string | null;
  solution: string | null;
  subsolution: string | null;
  line_code: string | null;
  solution_code: string | null;
  subsolution_code: string | null;
  revenue_target: number;
  volume_target: number;
  pct: number | null;
  total_year: number | null;
  import_source: string;
};

export function GoalsImportDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [parsed, setParsed] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  async function handleFile(file: File) {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    
    // Look for a sheet that contains volume/kg or similar
    // Based on user feedback, we might need to check multiple sheets
    let ws = wb.Sheets[wb.SheetNames[0]];
    let grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    
    const findHeader = (data: any[][]) => {
      for (let i = 0; i < Math.min(data.length, 15); i++) {
        const cells = (data[i] || []).map(norm);
        const matches = ["codigo", "descricao", "especie", "subsolucao", "solucao", "total"].filter(h => cells.includes(h));
        if (matches.length >= 3) return i;
      }
      return -1;
    };

    let headerIdx = findHeader(grid);
    
    // If first sheet doesn't have the expected headers, try others
    if (headerIdx < 0 && wb.SheetNames.length > 1) {
      for (let i = 1; i < wb.SheetNames.length; i++) {
        const tempWs = wb.Sheets[wb.SheetNames[i]];
        const tempGrid: any[][] = XLSX.utils.sheet_to_json(tempWs, { header: 1, defval: null });
        const idx = findHeader(tempGrid);
        if (idx >= 0) {
          ws = tempWs;
          grid = tempGrid;
          headerIdx = idx;
          break;
        }
      }
    }

    if (headerIdx < 0) {
      setErrors(["Não foi possível encontrar o cabeçalho. Verifique se a planilha contém as colunas: CODIGO, DESCRICAO, ESPECIE, etc."]);
      return;
    }

    const headers = grid[headerIdx].map(norm);
    const col = (name: string) => headers.findIndex((h) => h === norm(name));

    const cCodigo = col("codigo");
    const cDesc = col("descricao");
    const cCodEsp = col("codesp");
    const cEsp = col("especie");
    const cCodSubso = col("codsubso");
    const cSubso = col("subsolucao");
    const cCodSol = col("codsol");
    const cSol = col("solucao");
    const cPct = col("%");
    const cTotal = col("total");

    const monthCols: { month: number; revIdx: number; volIdx: number }[] = [];
    
    // Check if we have volume columns in THIS sheet
    const hasPairHeaders = headers.includes("faturamento") && headers.includes("volume/kg");
    
    // Check if there is another sheet for volumes (e.g., sheet with 'volume' or 'kg' in name)
    let volumeWs: XLSX.WorkSheet | null = null;
    let volumeGrid: any[][] | null = null;
    let vHeaderIdx = -1;

    if (!hasPairHeaders) {
      const volSheetName = wb.SheetNames.find(n => norm(n).includes("volume") || norm(n).includes("kg") || norm(n).includes("planilha1"));
      if (volSheetName && volSheetName !== wb.SheetNames[wb.SheetNames.indexOf(wb.SheetNames.find(n => wb.Sheets[n] === ws)!)]) {
        volumeWs = wb.Sheets[volSheetName];
        volumeGrid = XLSX.utils.sheet_to_json(volumeWs, { header: 1, defval: null });
        vHeaderIdx = findHeader(volumeGrid);
      }
    }

    if (hasPairHeaders) {
      const categoryRow = headerIdx > 0 ? grid[headerIdx - 1].map((c) => norm(c)) : [];
      let currentMonth = -1;
      let currentRev = -1;
      for (let i = 0; i < headers.length; i++) {
        const cat = categoryRow[i];
        if (cat) {
          const mi = MONTHS.findIndex((m) => norm(m) === cat || norm(m).startsWith(cat) || cat.startsWith(norm(m)));
          if (mi >= 0) currentMonth = mi + 1;
        }
        if (headers[i] === "faturamento" && currentMonth > 0) {
          currentRev = i;
        } else if (headers[i] === "volume/kg" && currentMonth > 0 && currentRev >= 0) {
          monthCols.push({ month: currentMonth, revIdx: currentRev, volIdx: i });
          currentRev = -1;
        }
      }
    } else {
      // Find months in primary sheet
      for (let m = 1; m <= 12; m++) {
        const mName = norm(MONTHS[m - 1]);
        const mIdx = col(mName);
        if (mIdx >= 0) {
          // If we have a separate volume grid, find corresponding column there
          let volIdx = -1;
          if (volumeGrid && vHeaderIdx >= 0) {
            const vHeaders = volumeGrid[vHeaderIdx].map(norm);
            volIdx = vHeaders.findIndex(h => h === mName);
          }
          monthCols.push({ month: m, revIdx: mIdx, volIdx });
        }
      }
    }

    if (monthCols.length === 0) {
      setErrors([`Nenhum mês detectado. Verifique os nomes das colunas (JANEIRO, FEVEREIRO, etc.).`]);
      return;
    }

    const rows: Row[] = [];
    const errs: string[] = [];
    for (let i = headerIdx + 1; i < grid.length; i++) {
      const r = grid[i];
      if (!r) continue;
      
      const codigo = String(r[cCodigo] ?? "").trim();
      const rep = cDesc >= 0 ? String(r[cDesc] ?? "").trim() : "";
      if (!codigo || !rep) continue;
      
      // Skip summary rows that often appear in Excel exports (TOTAL ORCADO, TOTAL DISTRIBUIDO, etc.)
      const repNorm = norm(rep);
      if (repNorm.includes("total") || repNorm.includes("distribuido") || repNorm.includes("orcado")) {
        continue;
      }

      
      const linha = r[cEsp] ? String(r[cEsp]).trim() : null;
      const sol = r[cSubso] ? String(r[cSubso]).trim() : null;
      const subso = r[cSol] ? String(r[cSol]).trim() : null;
      
      // Skip summary lines without breakdown (must have at least line and subsolução)
      if (!linha || !subso) continue;

      // Find matching row in volume grid if exists
      let volRow: any[] | null = null;
      if (volumeGrid && vHeaderIdx >= 0) {
        // Find row by matching ID, Line, and Solution codes
        const cSolCode = r[cCodSol];
        volRow = volumeGrid.find(vr => vr[cCodigo] === codigo && vr[cCodSol] === cSolCode) || null;
      }

      for (const mc of monthCols) {
        const rev = num(r[mc.revIdx]);
        let vol = 0;
        if (mc.volIdx >= 0) {
          vol = volRow ? num(volRow[mc.volIdx]) : num(r[mc.volIdx]);
        }
        if (rev === 0 && vol === 0) continue;
        rows.push({
          representative_code: codigo.padStart(6, "0"),
          representative_name: rep,
          year,
          month: mc.month,
          line: linha,
          solution: sol, // No Excel: ESPECIE (Linha) -> SUBSOLUCAO (Solução) -> SOLUCAO (Subsolução)
          subsolution: subso,
          line_code: r[cCodEsp] ? String(r[cCodEsp]) : null,
          solution_code: r[cCodSubso] ? String(r[cCodSubso]) : null,
          subsolution_code: r[cCodSol] ? String(r[cCodSol]) : null,
          revenue_target: rev,
          volume_target: vol,
          pct: cPct >= 0 ? num(r[cPct]) : null,
          total_year: cTotal >= 0 ? num(r[cTotal]) : null,
          import_source: file.name,
        });
      }
    }

    setParsed(rows);
    setErrors(errs);
    if (!rows.length) errs.push("Nenhuma linha de meta detalhada encontrada.");
  }

  async function commit() {
    if (!parsed.length) return;
    setBusy(true);
    try {
      // Wipe targets for this year first to avoid duplicates
      const codes = Array.from(new Set(parsed.map((r) => r.representative_code)));
      const { error: delErr } = await supabase
        .from("goal_targets")
        .delete()
        .eq("year", year)
        .in("representative_code", codes);
      if (delErr) throw delErr;

      // Try to bind to existing reps by code
      const { data: reps } = await supabase
        .from("representatives")
        .select("id, rep_code")
        .in("rep_code", codes);
      const repMap = new Map((reps ?? []).map((r: any) => [r.rep_code, r.id]));

      const payload = parsed.map((r) => ({
        ...r,
        representative_id: repMap.get(r.representative_code) ?? null,
      }));

      // Insert in chunks
      const chunkSize = 1000;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const { error } = await supabase.from("goal_targets").insert(payload.slice(i, i + chunkSize));
        if (error) throw error;
      }
      toast.success(`${payload.length} metas importadas para ${year}`);
      qc.invalidateQueries({ queryKey: ["goal_targets"] });
      setParsed([]);
      setFileName("");
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
        <Button variant="outline"><Upload className="size-4 mr-2" />Importar Excel</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Importar metas (FAT x VOL)</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Layout esperado: planilha com colunas <strong>CODIGO, REPRESENTANTE, CODESP, ESPECIE, CODSUBSO, SUBSOLUCAO, CODSOL, SOLUCAO, %, TOTAL</strong> seguidas de 12 grupos mensais
            (JANEIRO ... DEZEMBRO) com pares <strong>FATURAMENTO / VOLUME/KG</strong>. Reimportar o mesmo ano substitui os dados anteriores.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <div className="space-y-1.5">
              <Label className="text-xs">Ano da meta</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
            </div>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-primary/90"
          />
          {fileName && <p className="text-xs text-muted-foreground"><FileSpreadsheet className="size-3.5 inline mr-1" /> {fileName}</p>}
          {errors.length > 0 && (
            <Card className="p-3 bg-destructive/10 border-destructive/30 max-h-40 overflow-auto">
              <ul className="text-xs space-y-0.5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </Card>
          )}
          {parsed.length > 0 && (
            <Card className="p-3">
              <p className="text-sm">
                Pré-visualização: <Badge>{parsed.length}</Badge> registro(s) mensais detectados
                em {new Set(parsed.map((p) => p.representative_code)).size} representante(s).
              </p>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={commit} disabled={busy || !parsed.length}>Importar {parsed.length || ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
