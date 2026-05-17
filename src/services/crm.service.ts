import { supabase } from "@/integrations/supabase/client";
import type { Client, Representative } from "@/types/crm";

export const clientsService = {
  async getAll() {
    const { data, error } = await (supabase as any).from("clients_view").select("*").order("name");
    if (error) throw error;
    return data as Client[];
  },

  async delete(id: string) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
  },

  async save(payload: Partial<Client>, id?: string) {
    if (id) {
      const { error } = await supabase.from("clients").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("clients").insert(payload);
      if (error) throw error;
    }
  },

  async getSales(clientId: string) {
    const { data, error } = await (supabase as any)
      .from("sales")
      .select("*")
      .eq("client_id", clientId)
      .order("invoice_date", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  }
};

export const repsService = {
  async getAll() {
    const { data, error } = await supabase.from("representatives").select("*").order("name");
    if (error) throw error;
    return data as Representative[];
  },

  async delete(id: string) {
    const { error } = await supabase.from("representatives").delete().eq("id", id);
    if (error) throw error;
  },

  async save(payload: Partial<Representative>, id?: string) {
    if (id) {
      const { error } = await supabase.from("representatives").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("representatives").insert(payload);
      if (error) throw error;
    }
  }
};
