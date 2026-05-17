export type ClientType = "fazenda_ruminantes" | "fabrica_racao" | "revenda_agropecuaria";
export type ClientStatus = "active" | "inactive" | "prospect";

export interface Client {
  id: string;
  client_code: string | null;
  name: string;
  type: ClientType;
  cnpj: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  status: ClientStatus | null;
  effective_status?: ClientStatus | null;
  days_since_last_purchase?: number | null;
  last_purchase_date?: string | null;
  abc_class: string | null;
  total_purchases: number | null;
  representative_id: string | null;
}

export type RepStatus = "active" | "inactive";

export interface Representative {
  id: string;
  rep_code: string | null;
  name: string;
  company: string | null;
  company_cnpj: string | null;
  email: string | null;
  phone: string | null;
  status: RepStatus;
  total_sales: number | null;
  total_clients: number | null;
  home_state: string | null;
  home_city: string | null;
}

export interface DashboardStats {
  clientsCount: number;
  repsCount: number;
  oppsCount: number;
  totalSales: number;
  weightedForecast: number;
  conversionRate: number;
  oppsByStage: Array<{
    stage: string;
    value: number;
    count: number;
  }>;
  abc: Array<{ name: string; value: number }>;
  goalProgress: number;
  totalTarget: number;
  totalCurrent: number;
}
