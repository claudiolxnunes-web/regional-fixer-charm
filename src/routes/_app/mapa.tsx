import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/mapa")({ component: Mapa });

function Mapa() {
  const [q, setQ] = useState("");
  const [uf, setUf] = useState<string>("all");
  const [mode, setMode] = useState<"density" | "revenue">("density");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const markersRef = useRef<any>(null);

  const { data: clients } = useQuery({
    queryKey: ["map-clients"],
    queryFn: async () => (await supabase.from("clients")
      .select("id, name, city, state, lat, lng, abc_class, total_purchases, representative_id").limit(5000)).data ?? [],
  });

  const ufs = useMemo(() => Array.from(new Set((clients ?? []).map((c) => c.state).filter(Boolean))).sort(), [clients]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return (clients ?? []).filter((c) =>
      (uf === "all" || c.state === uf) &&
      (!term || c.name?.toLowerCase().includes(term) || c.city?.toLowerCase().includes(term))
    );
  }, [clients, q, uf]);

  const withCoords = filtered.filter((c) => c.lat && c.lng);

  // Init Leaflet
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current || mapRef.current) return;
      const L = (await import("leaflet")).default;
      await import("leaflet.heat");
      await import("leaflet/dist/leaflet.css");
      if (cancelled) return;

      const map = L.map(containerRef.current!, { zoomControl: true }).setView([-14.235, -51.9253], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
    })();
    return () => { cancelled = true; };
  }, []);

  // Update heatmap + markers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet.heat");
      if (cancelled || !mapRef.current) return;

      const map = mapRef.current;
      if (heatRef.current) { map.removeLayer(heatRef.current); heatRef.current = null; }
      markersRef.current?.clearLayers();

      if (withCoords.length === 0) return;

      const maxRev = Math.max(1, ...withCoords.map((c) => Number(c.total_purchases ?? 0)));
      const heatPoints = withCoords.map((c) => {
        const intensity = mode === "density" ? 0.5 : Math.min(1, Number(c.total_purchases ?? 0) / maxRev);
        return [Number(c.lat), Number(c.lng), intensity];
      }) as any;

      heatRef.current = (L as any).heatLayer(heatPoints, {
        radius: 25, blur: 18, maxZoom: 12,
        gradient: { 0.2: "#3b82f6", 0.4: "#22c55e", 0.6: "#eab308", 0.8: "#f97316", 1.0: "#ef4444" },
      }).addTo(map);

      // Marcadores leves (apenas até 300 para não pesar)
      withCoords.slice(0, 300).forEach((c) => {
        const m = L.circleMarker([Number(c.lat), Number(c.lng)], {
          radius: 4, color: "#0ea5e9", fillOpacity: 0.6, weight: 1,
        }).bindPopup(
          `<b>${c.name}</b><br/>${c.city ?? ""}/${c.state ?? ""}<br/>${c.abc_class ? "Classe " + c.abc_class + "<br/>" : ""}R$ ${Number(c.total_purchases ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
        );
        markersRef.current?.addLayer(m);
      });

      // Fit bounds
      try {
        const bounds = L.latLngBounds(withCoords.map((c) => [Number(c.lat), Number(c.lng)] as [number, number]));
        if (bounds.isValid()) map.fitBounds(bounds.pad(0.1), { animate: false });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [withCoords, mode]);

  const byState = useMemo(() => {
    const m = new Map<string, { count: number; revenue: number }>();
    filtered.forEach((c) => {
      const k = c.state ?? "—";
      const cur = m.get(k) ?? { count: 0, revenue: 0 };
      cur.count++; cur.revenue += Number(c.total_purchases ?? 0);
      m.set(k, cur);
    });
    return Array.from(m.entries()).map(([state, v]) => ({ state, ...v })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mapa de Calor — Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {filtered.length} clientes filtrados · {withCoords.length} com geolocalização.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar nome ou cidade..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={uf} onValueChange={setUf}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas UFs</SelectItem>
            {ufs.map((u) => <SelectItem key={u} value={u!}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant={mode === "density" ? "default" : "outline"} onClick={() => setMode("density")}>Densidade</Button>
          <Button size="sm" variant={mode === "revenue" ? "default" : "outline"} onClick={() => setMode("revenue")}>Receita</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div ref={containerRef} className="w-full h-[60vh] min-h-[400px] z-0" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Clientes por UF</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {byState.map((s) => (
              <div key={s.state} className="flex items-center justify-between border rounded-md p-2 text-sm">
                <Badge variant="outline">{s.state}</Badge>
                <div className="text-right">
                  <div className="font-medium">{s.count}</div>
                  <div className="text-xs text-muted-foreground">R$ {s.revenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            ))}
            {byState.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sem dados.</p>}
          </CardContent>
        </Card>
      </div>

      {withCoords.length === 0 && filtered.length > 0 && (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
          <MapPin className="size-5 mx-auto mb-2" />
          Nenhum cliente filtrado tem latitude/longitude cadastrados. Importe coordenadas em /clientes para visualizar no mapa.
        </CardContent></Card>
      )}
    </div>
  );
}
