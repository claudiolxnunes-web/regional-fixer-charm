import { createClient } from "@supabase/supabase-js";

export function verifyCronSecret(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("cron secret not configured", { status: 500 });
  const hdr = request.headers.get("x-cron-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (hdr !== secret) return new Response("unauthorized", { status: 401 });
  return null;
}

export function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function logJobRun(jobName: string, startedAt: number, status: "success" | "error", result: any, error?: string) {
  try {
    const sb = serviceClient();
    await sb.from("job_runs").insert({
      job_name: jobName,
      status,
      duration_ms: Date.now() - startedAt,
      result: result ?? null,
      error: error ?? null,
    });
  } catch (e) {
    console.error("logJobRun failed", e);
  }
}
