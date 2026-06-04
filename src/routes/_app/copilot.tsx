import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Send, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { askCopilot } from "@/lib/copilot.functions";

export const Route = createFileRoute("/_app/copilot")({ component: Copilot });

import { VoiceCapture } from "@/components/VoiceCapture";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quais 5 clientes mais caíram em consumo nos últimos 90 dias?",
  "Como está o desempenho do meu top representante vs. a média?",
  "Qual a projeção de faturamento do mês?",
  "Quais alertas críticos exigem ação imediata hoje?",
  "Qual linha de produto está crescendo mais?",
  "Quais propostas em aberto valem mais de R$ 50 mil?",
];

function Copilot() {
  const fn = useServerFn(askCopilot);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const m = useMutation({
    mutationFn: (q: string) => fn({ data: { question: q, history: messages } }),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Falha ao consultar Copiloto");
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, m.isPending]);

  const send = (q: string) => {
    const text = q.trim();
    if (!text || m.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    m.mutate(text);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="size-6 text-primary" /> Copiloto Comercial
        </h1>
        <p className="text-sm text-muted-foreground">
          Pergunte qualquer coisa sobre seus dados — vendas, clientes, alertas, pipeline.
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <Bot className="size-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Comece com uma pergunta — ou escolha um exemplo abaixo:
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm rounded-lg border bg-card hover:bg-accent transition px-3 py-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`size-8 rounded-full grid place-items-center shrink-0 ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {msg.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {m.isPending && (
            <div className="flex gap-3">
              <div className="size-8 rounded-full grid place-items-center bg-muted">
                <Bot className="size-4" />
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3 text-sm flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Consultando seus dados...
              </div>
            </div>
          )}
        </div>

        <CardContent className="border-t pt-3 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <VoiceCapture 
              context="semantic_search" 
              label="Falar com Copiloto" 
              onResult={({ transcript }) => send(transcript)} 
            />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 items-end"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Faça uma pergunta sobre seus dados..."
              rows={2}
              className="resize-none flex-1"
              disabled={m.isPending}
            />
            <Button type="submit" disabled={m.isPending || !input.trim()} size="icon" aria-label="Enviar pergunta" className="size-11">
              {m.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-2">
            O Copiloto usa dados dos últimos 90 dias. Enter envia, Shift+Enter quebra linha.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
