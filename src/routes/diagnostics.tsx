import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { checkEnv } from "@/lib/debug.functions";

export const Route = createFileRoute("/diagnostics")({ component: Diagnostics });

function Diagnostics() {
  const fn = useServerFn(checkEnv);
  const { data, isLoading, error } = useQuery({
    queryKey: ["env-check"],
    queryFn: () => fn(),
  });

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Diagnóstico do Servidor</h1>
      {isLoading && <p>Carregando...</p>}
      {error && <p className="text-red-500">Erro: {(error as any).message}</p>}
      {data && (
        <pre className="bg-muted p-4 rounded border">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
