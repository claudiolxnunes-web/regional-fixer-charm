import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Route as RouteIcon, CloudSun, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/mapa")({ component: Mapa });

type ClientPt = {
  id: string; name: string; city: string | null; state: string | null;
  lat: number | string | null; lng: number | string | null;
  abc_class: string | null; total_purchases: number | string | null;
};

// Coordenadas aproximadas dos principais municípios (MG/GO) para agilização
const CITY_COORDS: Record<string, [number, number]> = {
  "COROMANDEL-MG": [-18.4731, -47.2003],
  "CATALAO-GO": [-18.1691, -47.9458],
  "PATOS DE MINAS-MG": [-18.5789, -46.5181],
  "JOAO PINHEIRO-MG": [-17.7428, -46.1722],
  "CRUZEIRO DA FORTALEZA-MG": [-18.9431, -46.7703],
  "DOURADOQUARA-MG": [-18.4419, -47.6078],
  "PATROCINIO-MG": [-18.9439, -46.9922],
  "ABADIA DOS DOURADOS-MG": [-18.4864, -47.4003],
  "PARACATU-MG": [-17.2217, -46.8744],
  "SERRA DO SALITRE-MG": [-19.1122, -46.6853],
  "RIO VERDE-GO": [-17.7911, -50.9203],
  "JOAIMA-MG": [-16.6536, -41.0319],
  "CRISTALINA-GO": [-16.7658, -47.6133],
  "GUIMARANIA-MG": [-18.8475, -46.7936],
  "VAZANTE-MG": [-17.9869, -46.9075],
  "LAGAMAR-MG": [-18.1722, -46.8094],
  "LAGOA FORMOSA-MG": [-18.7781, -46.4078],
  "SACRAMENTO-MG": [-19.8597, -47.4394],
  "ALEXANIA-GO": [-16.0806, -48.5075],
  "MONTE CARMELO-MG": [-18.7247, -47.4983],
  "CARMO DO PARANAIBA-MG": [-18.995, -46.3189],
  "GUARDA-MOR-MG": [-17.7725, -47.0989],
  "IBIA-MG": [-19.4789, -46.6917],
  "BRASILIA-DF": [-15.7801, -47.9292],
  "UNAI-MG": [-16.3575, -46.9061],
  "TIROS-MG": [-18.9842, -45.9753],
  "CORUMBA DE GOIAS-GO": [-15.9231, -48.8089],
  "SANTA ROSA DE GOIAS-GO": [-16.0828, -49.495],
  "ESTRELA DO SUL-MG": [-18.7431, -47.695],
  "LAGOA GRANDE-MG": [-17.8425, -46.5139],
  "CAMPINA VERDE-MG": [-19.5356, -49.4864],
  "ITAPURANGA-GO": [-15.5617, -49.9486],
  "GOVERNADOR VALADARES-MG": [-18.8501, -41.9482],
  "PERDIZES-MG": [-19.3528, -47.2889],
  "JARAGUA-GO": [-15.7564, -49.3364],
  "MONTE FORMOSO-MG": [-16.8833, -40.3833],
  "JATAI-GO": [-17.8814, -51.7144],
  "UBERABA-MG": [-19.7436, -47.9392],
  "MINEIROS-GO": [-17.5622, -52.5514],
};

// Nearest-neighbor TSP (suficiente p/ ~20 pontos por dia)
function optimizeRoute(points: { id: string; lat: number; lng: number }[], startIdx = 0) {
  if (points.length <= 2) return points.map((_, i) => i);
  const visited = new Set<number>([startIdx]);
  const order = [startIdx];
  while (order.length < points.length) {
    const last = points[order[order.length - 1]];
    let best = -1; let bestD = Infinity;
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      const d = Math.hypot(points[i].lat - last.lat, points[i].lng - last.lng);
      if (d < bestD) { bestD = d; best = i; }
    }
    visited.add(best); order.push(best);
  }
  return order;
}

function totalKm(ordered: { lat: number; lng: number }[]) {
  let km = 0;
  for (let i = 1; i < ordered.length; i++) {
    const a = ordered[i - 1], b = ordered[i];
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    km += 2 * R * Math.asin(Math.sqrt(s));
  }
  return km;
}

function Mapa() {
  const [q, setQ] = useState("");
  const [uf, setUf] = useState<string>("all");
  const [mode, setMode] = useState<"density" | "revenue">("density");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showWeather, setShowWeather] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const weatherLayerRef = useRef<any>(null);

  const { data: clients } = useQuery({
    queryKey: ["map-clients"],
    queryFn: async () => (await supabase.from("clients")
      .select("id, name, city, state, lat, lng, abc_class, total_purchases, representative_id").limit(5000)).data ?? [],
  });

  const ufs = useMemo(() => Array.from(new Set((clients ?? []).map((c) => c.state).filter(Boolean))).sort(), [clients]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return ((clients ?? []) as ClientPt[]).filter((c) =>
      (uf === "all" || c.state === uf) &&
      (!term || c.name?.toLowerCase().includes(term) || c.city?.toLowerCase().includes(term))
    );
  }, [clients, q, uf]);

  const withCoords = useMemo(() => {
    return (filtered as ClientPt[]).map(c => {
      let lat = c.lat ? Number(c.lat) : null;
      let lng = c.lng ? Number(c.lng) : null;
      let isCityCoord = false;
      
      if (!lat && c.city) {
        const k = `${c.city}-${c.state}`.toUpperCase();
        if (CITY_COORDS[k]) {
          [lat, lng] = CITY_COORDS[k];
          isCityCoord = true;
        }
      }
      return { ...c, lat, lng, isCityCoord };
    }).filter(c => c.lat && c.lng) as (ClientPt & { lat: number, lng: number, isCityCoord: boolean })[];
  }, [filtered]);

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

      // Marcadores (até 500). Em selectMode, clicar adiciona/remove da rota.
      withCoords.slice(0, 500).forEach((c) => {
        const isSel = selected.includes(c.id);
        const pos: [number, number] = c.isCityCoord 
          ? [c.lat + (Math.random() - 0.5) * 0.015, c.lng + (Math.random() - 0.5) * 0.015] 
          : [c.lat, c.lng];
        const m = L.circleMarker(pos, {
          radius: isSel ? 7 : 4,
          color: isSel ? "#16a34a" : "#0ea5e9",
          fillColor: isSel ? "#16a34a" : "#0ea5e9",
          fillOpacity: isSel ? 0.9 : 0.6,
          weight: isSel ? 2 : 1,
        }).bindPopup(
          `<b>${c.name}</b><br/>${c.city ?? ""}/${c.state ?? ""}<br/>${c.abc_class ? "Classe " + c.abc_class + "<br/>" : ""}R$ ${Number(c.total_purchases ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
        );
        if (selectMode) {
          m.on("click", () => {
            setSelected((cur) => cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id]);
          });
        }
        markersRef.current?.addLayer(m);
      });

      // Fit bounds inicial (apenas se não há rota)
      if (!routeLayerRef.current) {
        try {
          const bounds = L.latLngBounds(withCoords.map((c) => [Number(c.lat), Number(c.lng)] as [number, number]));
          if (bounds.isValid()) map.fitBounds(bounds.pad(0.1), { animate: false });
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [withCoords, mode, selectMode, selected]);

  // Rota otimizada
  const routeInfo = useMemo(() => {
    const pts = selected
      .map((id) => withCoords.find((c) => c.id === id))
      .filter(Boolean)
      .map((c: any) => ({ id: c.id, name: c.name, lat: Number(c.lat), lng: Number(c.lng) }));
    if (pts.length < 2) return null;
    const order = optimizeRoute(pts, 0);
    const ordered = order.map((i) => pts[i]);
    return { ordered, km: totalKm(ordered) };
  }, [selected, withCoords]);

  // Desenhar rota
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      const map = mapRef.current;
      if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
      if (!routeInfo) return;

      const group = L.layerGroup();
      const latlngs = routeInfo.ordered.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(latlngs, { color: "#16a34a", weight: 4, opacity: 0.8, dashArray: "6,8" }).addTo(group);
      routeInfo.ordered.forEach((p, idx) => {
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "route-pin",
            html: `<div style="background:#16a34a;color:white;border-radius:9999px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.3);border:2px solid white">${idx + 1}</div>`,
            iconSize: [24, 24], iconAnchor: [12, 12],
          }),
        }).bindPopup(`<b>#${idx + 1}</b> ${p.name}`).addTo(group);
      });
      group.addTo(map);
      routeLayerRef.current = group;

      try {
        const bounds = L.latLngBounds(latlngs);
        map.fitBounds(bounds.pad(0.2), { animate: true });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [routeInfo]);

  async function loadWeather() {
    const L = (await import("leaflet")).default;
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (weatherLayerRef.current) { map.removeLayer(weatherLayerRef.current); weatherLayerRef.current = null; }
    setShowWeather(true);
    setWeatherLoading(true);
    try {
      // Pontos: rota selecionada, ou top 12 por receita
      const basis = routeInfo
        ? routeInfo.ordered.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }))
        : [...withCoords]
            .sort((a, b) => Number(b.total_purchases ?? 0) - Number(a.total_purchases ?? 0))
            .slice(0, 12)
            .map((c) => ({ id: c.id, name: c.name!, lat: Number(c.lat), lng: Number(c.lng) }));

      if (basis.length === 0) { toast.info("Sem pontos para consultar clima."); return; }

      const group = L.layerGroup();
      const results = await Promise.all(basis.map(async (p) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`;
          const r = await fetch(url);
          const j = await r.json();
          return { p, w: j.current };
        } catch { return { p, w: null }; }
      }));

      results.forEach(({ p, w }) => {
        if (!w) return;
        const code: number = w.weather_code ?? 0;
        const emoji = code === 0 ? "☀️" : code < 3 ? "🌤️" : code < 50 ? "☁️" : code < 70 ? "🌧️" : code < 80 ? "❄️" : "⛈️";
        const t = Math.round(w.temperature_2m);
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: "weather-pin",
            html: `<div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:2px 6px;font-size:11px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.2);white-space:nowrap">${emoji} ${t}°</div>`,
            iconSize: [60, 22], iconAnchor: [30, -8],
          }),
        }).bindPopup(`<b>${p.name}</b><br/>${emoji} ${t}°C · vento ${Math.round(w.wind_speed_10m)} km/h<br/>Precipitação: ${w.precipitation ?? 0} mm`).addTo(group);
      });
      group.addTo(map);
      weatherLayerRef.current = group;
      toast.success(`Clima atualizado para ${results.filter((r) => r.w).length} pontos.`);
    } finally {
      setWeatherLoading(false);
    }
  }

  function clearWeather() {
    if (weatherLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(weatherLayerRef.current);
      weatherLayerRef.current = null;
    }
    setShowWeather(false);
  }

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
        <div className="flex items-center gap-2 ml-2 border-l pl-2">
          <Checkbox id="selmode" checked={selectMode} onCheckedChange={(v) => setSelectMode(!!v)} />
          <label htmlFor="selmode" className="text-xs cursor-pointer flex items-center gap-1">
            <RouteIcon className="size-3" /> Montar rota
          </label>
        </div>
        <Button size="sm" variant={showWeather ? "default" : "outline"} onClick={showWeather ? clearWeather : loadWeather} disabled={weatherLoading}>
          <CloudSun className="size-3 mr-1" /> {weatherLoading ? "Carregando..." : showWeather ? "Ocultar clima" : "Clima"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-md">
            <div ref={containerRef} className="w-full h-[60vh] min-h-[400px] z-0" />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectMode && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1"><RouteIcon className="size-4" /> Rota ({selected.length})</span>
                  {selected.length > 0 && (
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setSelected([])}>
                      <X className="size-3" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs max-h-[40vh] overflow-y-auto">
                {!routeInfo && <p className="text-muted-foreground">Clique em pontos no mapa para montar a rota (mín. 2).</p>}
                {routeInfo && (
                  <>
                    <div className="text-muted-foreground mb-2">
                      ≈ <b>{routeInfo.km.toFixed(1)} km</b> total (linha reta) · {routeInfo.ordered.length} paradas
                    </div>
                    <ol className="space-y-1">
                      {routeInfo.ordered.map((p, i) => (
                        <li key={p.id} className="flex items-start gap-2">
                          <span className="bg-green-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          <span className="flex-1">{p.name}</span>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Clientes por UF</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[40vh] overflow-y-auto">
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
