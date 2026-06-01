import { createServerFn } from "@tanstack/react-start";

export const checkEnv = createServerFn({ method: "GET" })
  .handler(async () => {
    return {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      LOVABLE_API_KEY: !!process.env.LOVABLE_API_KEY,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    };
  });
