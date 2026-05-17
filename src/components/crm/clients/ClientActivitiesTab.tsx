import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export function ClientActivitiesTab({ clientId }: { clientId: string }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["client_activities", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, title, type, status, scheduled_at, completed_at, outcome")
        .eq("client_id", clientId)
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>;
  if (!activities.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade registrada para este cliente.</p>;

  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
          <tr>
            <th className="text-left p-2 font-medium">Data</th>
            <th className="text-left p-2 font-medium">Título</th>
            <th className="text-left p-2 font-medium">Tipo</th>
            <th className="text-left p-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a: any) => (
            <tr key={a.id} className="border-t">
              <td className="p-2 whitespace-nowrap text-xs">{a.scheduled_at ? new Date(a.scheduled_at).toLocaleDateString("pt-BR") : "-"}</td>
              <td className="p-2">{a.title}</td>
              <td className="p-2 text-xs">{a.type}</td>
              <td className="p-2"><Badge variant="outline" className="text-xs">{a.status ?? "-"}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
