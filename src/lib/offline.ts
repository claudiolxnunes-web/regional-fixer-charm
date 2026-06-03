// Offline cache + sync queue (IndexedDB via idb-keyval).
// Sem service worker — leve e seguro para o preview do Lovable.
import { get, set, del, keys } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";

const CACHE_PREFIX = "cache:";
const QUEUE_PREFIX = "queue:";

export type CachedSnapshot<T> = { data: T; cachedAt: number };

export async function cacheSet<T>(key: string, data: T) {
  await set(CACHE_PREFIX + key, { data, cachedAt: Date.now() } as CachedSnapshot<T>);
}

export async function cacheGet<T>(key: string): Promise<CachedSnapshot<T> | null> {
  return (await get(CACHE_PREFIX + key)) ?? null;
}

export type QueuedAction =
  | { kind: "daily_report"; payload: any; queuedAt: number }
  | { kind: "spin_note"; payload: any; queuedAt: number };

export async function enqueue(action: Omit<QueuedAction, "queuedAt">) {
  const id = crypto.randomUUID();
  await set(QUEUE_PREFIX + id, { ...action, queuedAt: Date.now() } as QueuedAction);
  return id;
}

export async function pendingCount(): Promise<number> {
  const all = await keys();
  return all.filter((k) => String(k).startsWith(QUEUE_PREFIX)).length;
}

export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  const all = await keys();
  const qKeys = all.filter((k) => String(k).startsWith(QUEUE_PREFIX));
  let ok = 0;
  let fail = 0;
  for (const k of qKeys) {
    const action = (await get(k)) as QueuedAction | undefined;
    if (!action) { await del(k); continue; }
    try {
      if (action.kind === "daily_report") {
        const { error } = await supabase.from("daily_reports").insert(action.payload);
        if (error) throw error;
      } else if (action.kind === "spin_note") {
        const { error } = await supabase.from("spin_notes").insert(action.payload);
        if (error) throw error;
      }
      await del(k);
      ok++;
    } catch (e) {
      fail++;
      console.warn("[offline] falha sincronizando", k, e);
    }
  }
  return { ok, fail };
}

// Pré-carrega dados críticos para uso offline.
export async function warmCache(userId: string) {
  try {
    const [clients, activities] = await Promise.all([
      supabase.from("clients").select("id, name, city, state, phone, abc_class, total_purchases").limit(2000),
      supabase.from("activities").select("id, title, client_id, scheduled_at, status, type, clients(name)").eq("status", "pending").limit(1000),
    ]);
    if (clients.data) await cacheSet(`clients:${userId}`, clients.data);
    if (activities.data) await cacheSet(`activities:${userId}`, activities.data);
  } catch (e) {
    console.warn("[offline] warmCache falhou", e);
  }
}
