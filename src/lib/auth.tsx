import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "manager" | "rep" | "representative" | "user" | "superadmin";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  roles: Role[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: Role) => boolean;
  isStaff: boolean;
  isRepresentative: boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) loadRoles(s.user.id);
      setLoading(false);
    });

    // 2. Listen for changes
    // IMPORTANT: Never call supabase.from() / await async DB queries directly inside
    // onAuthStateChange — it deadlocks the auth lock. Defer with setTimeout(0).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => { loadRoles(s.user.id); }, 0);
      } else {
        setRoles([]);
      }
      if (event === 'SIGNED_OUT') setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadRoles(uid: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as Role));
  }

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
    hasRole: (r) => roles.includes(r),
    isStaff: roles.includes("admin") || roles.includes("manager") || roles.includes("superadmin"),
    isRepresentative: roles.includes("representative") || roles.includes("rep"),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
