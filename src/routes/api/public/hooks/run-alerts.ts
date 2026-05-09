import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/hooks/run-alerts")({
  server: {
    handlers: {
      POST: async () => {
        const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
          return new Response(JSON.stringify({ error: "missing env" }), { status: 500 });
        }
        const supabase = createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data, error } = await supabase.rpc("generate_inactive_client_alerts");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        return new Response(
          JSON.stringify({ ok: true, inactive_alerts_created: data ?? 0, ts: new Date().toISOString() }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
    },
  },
});
