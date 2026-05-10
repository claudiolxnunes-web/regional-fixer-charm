import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/mapa")({ component: Mapa });

function Mapa() {
  const [q, setQ] = useState("");
  const { data: clients } = useQuery({
    queryKey: ["map-clients"],
    queryFn: async () => (await supabase.from("clients")
      .select("id, name, city, state, lat, lng, abc_class, total_purchases").limit(2000)).data ?? [],
  });

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return (clients ?? []).filter((c) =>
      !term || c.name?.toLowerCase().includes(term) || c.city?.toLowerCase().includes(term) || c.state?.toLowerCase().includes(term)
    );
  }, [clients, q]);

  const byState = useMemo(() => {
    const m = new Map<string, { count: number; revenue: number; cities: Set<string> }>();
    filtered.forEach((c) => {
      const k = c.state ?? "—";
      const cur = m.get(k) ?? { count: 0, revenue: 0, cities: new Set<string>() };
      cur.count++;
      cur.revenue += Number(c.total_purchases ?? 0);
      if (c.city) cur.cities.add(c.city);
      m.set(k, cur);
    });
    return Array.from(m.entries()).map(([state, v]) => ({ state, ...v, citiesCount: v.cities.size }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const withCoords = filtered.filter((c) => c.lat && c.lng);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mapa de Clientes</h1>
        <p className="text-sm text-muted-foreground">Distribuição geográfica · {filtered.length} clientes ({withCoords.length} com coordenadas).</p>
      </div>

      <Input placeholder="Buscar por nome, cidade ou UF..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Clientes por UF</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {byState.map((s) => (
              <div key={s.state} className="flex items-center justify-between border rounded-md p-2 text-sm">
                <div className="flex items-center gap-2"><Badge variant="outline">{s.state}</Badge><span className="text-muted-foreground">{s.citiesCount} cidades</span></div>
                <div className="text-right">
                  <div className="font-medium">{s.count} clientes</div>
                  <div className="text-xs text-muted-foreground">R$ {s.revenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            ))}
            {byState.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Clientes com geolocalização</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {withCoords.slice(0, 100).map((c) => (
              <a
                key={c.id}
                href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-3 border rounded-md p-2 text-sm hover:bg-accent"
              >
                <MapPin className="size-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.city}/{c.state}</div>
                </div>
                {c.abc_class && <Badge variant="outline">{c.abc_class}</Badge>}
              </a>
            ))}
            {withCoords.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente com lat/lng cadastrado.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
