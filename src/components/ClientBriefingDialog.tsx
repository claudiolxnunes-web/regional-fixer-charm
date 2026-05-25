import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateClientBriefing } from "@/lib/briefing.functions";
import { toast } from "sonner";

interface Props {
  clientId: string;
  clientName?: string;
  triggerLabel?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost" | "secondary";
}

export function ClientBriefingDialog({
  clientId,
  clientName,
  triggerLabel = "Briefing IA",
  size = "sm",
  variant = "outline",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const gen = useServerFn(generateClientBriefing);

  async function run() {
    setLoading(true);
    try {
      const res = await gen({ data: { client_id: clientId } });
      setBriefing(res.briefing);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar briefing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !briefing) run();
        if (!o) setBriefing(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <Sparkles className="size-4 mr-1 text-primary" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Briefing pré-visita {clientName ? `· ${clientName}` : ""}
          </DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="size-4 animate-spin" /> Analisando histórico e gerando briefing...
          </div>
        )}
        {!loading && briefing && (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {briefing}
          </div>
        )}
        {!loading && briefing && (
          <Button variant="outline" size="sm" onClick={run}>
            Gerar novamente
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
