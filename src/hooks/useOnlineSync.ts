import { useEffect, useState, useCallback } from "react";
import { flushQueue, pendingCount, warmCache } from "@/lib/offline";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOnlineSync() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await pendingCount());
  }, []);

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { ok, fail } = await flushQueue();
      if (ok > 0) toast.success(`${ok} registro(s) sincronizado(s)`);
      if (fail > 0) toast.error(`${fail} registro(s) com erro de sincronização`);
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [syncing, refresh]);

  useEffect(() => {
    refresh();
    const onOnline = () => { setOnline(true); sync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh, sync]);

  // Aquecer cache quando logar / quando online
  useEffect(() => {
    if (!online) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) warmCache(user.id);
    })();
  }, [online]);

  return { online, pending, syncing, sync, refresh };
}
