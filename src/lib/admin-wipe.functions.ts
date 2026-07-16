import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TABLES = ["sales", "open_orders", "clients", "all"] as const;

export const wipeTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ table: z.enum(TABLES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Only admin/superadmin may wipe data
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "superadmin",
    });
    if (!isAdmin && !isSuper) throw new Error("Apenas administradores podem apagar dados.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const targets = data.table === "all" ? ["sales", "open_orders", "clients"] : [data.table];
    for (const t of targets) {
      const { error } = await supabaseAdmin.from(t).delete().not("id", "is", null);
      if (error) throw new Error(`${t}: ${error.message}`);
    }
    return { ok: true, tables: targets };
  });
