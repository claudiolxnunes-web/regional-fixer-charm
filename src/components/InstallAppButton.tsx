import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Botão "Instalar app" — só aparece quando o navegador dispara `beforeinstallprompt`
 * (Chrome/Edge Android, Edge desktop). Em iOS Safari, mostra dica de "Adicionar à tela inicial".
 */
export function InstallAppButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-install-dismissed") === "1") { setDismissed(true); return; }

    // já instalado?
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    if (standalone) return;

    const onBIP = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari não dispara beforeinstallprompt
    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    if (isIOS) setIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
  }

  if (evt) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-primary/5 p-2.5 text-xs">
        <Download className="size-4 text-primary shrink-0" />
        <span className="flex-1">Instale o app na tela inicial para acesso rápido.</span>
        <Button size="sm" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); }}>
          Instalar
        </Button>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
      </div>
    );
  }

  if (iosHint) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-primary/5 p-2.5 text-xs">
        <Download className="size-4 text-primary shrink-0" />
        <span className="flex-1">No iPhone: toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>.</span>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
      </div>
    );
  }

  return null;
}
