import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Filters = {
  startDate?: string | null; // YYYY-MM-DD (inclusive)
  endDate?: string | null;   // YYYY-MM-DD (exclusive)
  search?: string | null;
};

type SummaryResult = {
  totalRev: number;
  totalMB: number;
  totalML: number;
  totalQty: number;
  clients: number;
  invoices: number;
  byLine: Array<{ key: string; rev: number }>;
  bySolution: Array<{ key: string; rev: number }>;
  byRep: Array<{ key: string; rev: number }>;
  isStaff: boolean;
};

async function isStaffCheck(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  return !!data;
}

function applyFilters(q: any, f: Filters) {
  if (f.startDate) q = q.gte("invoice_date", f.startDate);
  if (f.endDate) q = q.lt("invoice_date", f.endDate);
  if (f.search && f.search.trim()) {
    const s = f.search.replace(/[,()]/g, " ").trim();
    q = q.or(
      [
        `client_name.ilike.%${s}%`,
        `client_code.ilike.%${s}%`,
        `product_name.ilike.%${s}%`,
        `representative.ilike.%${s}%`,
        `invoice_number.ilike.%${s}%`,
        `line.ilike.%${s}%`,
        `solution.ilike.%${s}%`,
      ].join(",")
    );
  }
  return q;
}

/** Aggregates for /vendas KPIs and rank cards. Server-side, respects RLS. */
export const getSalesSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Filters) => input)
  .handler(async ({ data, context }): Promise<SummaryResult> => {
    const { supabase, userId } = context as any;
    const isStaff = await isStaffCheck(supabase, userId);
    const table = isStaff ? "sales_secure_view" : "sales_rep_view";

    const cols = isStaff
      ? "revenue, mb_cb_total, ml_cb_total, qty_bags, client_code, invoice_number, line, solution, representative"
      : "revenue, qty_bags, client_code, invoice_number, line, solution, representative";

    // Stream in pages to avoid the 1000-row cap.
    const pageSize = 1000;
    let from = 0;
    let done = false;
    let totalRev = 0, totalMB = 0, totalML = 0, totalQty = 0;
    const clientSet = new Set<string>();
    const invoiceSet = new Set<string>();
    const byLine: Record<string, number> = {};
    const bySol: Record<string, number> = {};
    const byRep: Record<string, number> = {};

    while (!done) {
      let q = (supabase as any).from(table).select(cols).range(from, from + pageSize - 1);
      q = applyFilters(q, data);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      const list = rows ?? [];
      for (const r of list as any[]) {
        const rev = Number(r.revenue ?? 0);
        totalRev += rev;
        totalQty += Number(r.qty_bags ?? 0);
        if (isStaff) {
          totalMB += Number(r.mb_cb_total ?? 0);
          totalML += Number(r.ml_cb_total ?? 0);
        }
        if (r.client_code) clientSet.add(r.client_code);
        if (r.invoice_number) invoiceSet.add(r.invoice_number);
        const l = r.line || "—";
        const s = r.solution || "—";
        const rp = r.representative || "—";
        byLine[l] = (byLine[l] ?? 0) + rev;
        bySol[s] = (bySol[s] ?? 0) + rev;
        byRep[rp] = (byRep[rp] ?? 0) + rev;
      }
      if (list.length < pageSize) done = true;
      else from += pageSize;
      if (from > 200000) done = true; // hard safety
    }

    const toRank = (m: Record<string, number>) =>
      Object.entries(m)
        .map(([key, rev]) => ({ key, rev }))
        .sort((a, b) => b.rev - a.rev)
        .slice(0, 12);

    return {
      totalRev,
      totalMB,
      totalML,
      totalQty,
      clients: clientSet.size,
      invoices: invoiceSet.size,
      byLine: toRank(byLine),
      bySolution: toRank(bySol),
      byRep: toRank(byRep),
      isStaff,
    };
  });

type PageInput = Filters & { page: number; pageSize: number };

/** Paginated sales rows for /vendas table. Uses secure/rep view per role. */
export const getSalesPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PageInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const isStaff = await isStaffCheck(supabase, userId);
    const table = isStaff ? "sales_secure_view" : "sales_rep_view";
    const cols = isStaff
      ? "invoice_date, invoice_number, client_code, client_name, product_name, line, solution, qty_bags, revenue, mb_cb_total, mb_cb_pct, ml_cb_total, representative, state"
      : "invoice_date, invoice_number, client_code, client_name, product_name, line, solution, qty_bags, revenue, representative, state";

    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = (supabase as any)
      .from(table)
      .select(cols, { count: "exact" })
      .order("invoice_date", { ascending: false, nullsFirst: false })
      .range(from, to);
    q = applyFilters(q, data);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0, isStaff };
  });
