import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { transcribeAndStructure } from "@/lib/voice.functions";

type Context = "daily_report" | "visit_spin";

interface Props {
  context?: Context;
  onResult: (data: { transcript: string; structured: any }) => void;
  label?: string;
}

export function VoiceCapture({ context = "daily_report", onResult, label = "Ditar pela voz" }: Props) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcribe = useServerFn(transcribeAndStructure);

  const stop = useCallback(() => {
    const mr = mediaRecRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          if (blob.size < 2000) {
            toast.error("Gravação muito curta. Tente novamente.");
            return;
          }
          const ab = await blob.arrayBuffer();
          // Convert to base64 in chunks to avoid stack overflow
          const bytes = new Uint8Array(ab);
          let binary = "";
          const CHUNK = 0x8000;
          for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
          }
          const b64 = btoa(binary);
          toast.info("Transcrevendo e estruturando...");
          const res = await transcribe({ data: { audio_base64: b64, mime_type: "audio/webm", context } });
          if (!res.transcript) {
            toast.error("Não consegui entender. Tente em ambiente mais silencioso.");
            return;
          }
          onResult(res);
          toast.success("Pronto! Campos preenchidos pela IA.");
        } catch (e: any) {
          toast.error(e?.message ?? "Erro ao processar áudio");
        } finally {
          setProcessing(false);
        }
      };
      mr.start();
      setRecording(true);
    } catch (e: any) {
      toast.error("Permita acesso ao microfone para usar a voz");
    }
  }, [context, onResult, transcribe]);

  if (processing) {
    return (
      <Button type="button" variant="outline" disabled>
        <Loader2 className="size-4 mr-2 animate-spin" /> Processando voz...
      </Button>
    );
  }

  if (recording) {
    return (
      <Button type="button" variant="destructive" onClick={stop}>
        <Square className="size-4 mr-2" /> Parar e enviar
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" onClick={start}>
      <Mic className="size-4 mr-2" /> {label} <Sparkles className="size-3 ml-2 text-primary" />
    </Button>
  );
}
