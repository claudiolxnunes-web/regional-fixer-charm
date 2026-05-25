import { useOnlineSync } from "@/hooks/useOnlineSync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export function OfflineIndicator() {
  const { online, pending, syncing, sync } = useOnlineSync();

  if (online && pending === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {!online && (
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700 dark:text-amber-400">
          <WifiOff className="size-3" /> Offline
        </Badge>
      )}
      {online && pending > 0 && (
        <Badge variant="outline" className="gap-1 border-sky-500 text-sky-700 dark:text-sky-400">
          <Wifi className="size-3" /> Online
        </Badge>
      )}
      {pending > 0 && (
        <Button size="sm" variant="outline" className="h-7 px-2 gap-1" onClick={sync} disabled={syncing || !online}>
          <RefreshCw className={`size-3 ${syncing ? "animate-spin" : ""}`} />
          {pending} pendente{pending > 1 ? "s" : ""}
        </Button>
      )}
    </div>
  );
}
