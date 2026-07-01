/**
 * Helpers de geolocalização, geocoding (OpenStreetMap/Nominatim) e otimização
 * de rotas. Sem chaves de API — usa apenas serviços gratuitos públicos.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Fórmula de Haversine — distância em km entre dois pontos geográficos.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // raio da Terra em km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Pega a posição atual do navegador. Faz fallback gracioso se negado.
 */
export function getCurrentPosition(timeoutMs = 8000): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/**
 * Geocoding via Nominatim (OSM). Recebe um endereço textual e retorna lat/lng.
 * Respeita os termos de uso (User-Agent + 1 req/seg).
 */
export async function geocodeAddress(query: string): Promise<LatLng | null> {
  if (!query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Reverse geocoding via Nominatim (OSM). Retorna endereço textual aproximado.
 */
export async function reverseGeocode(point: LatLng): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.lat}&lon=${point.lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.display_name as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * Otimiza ordem de paradas usando algoritmo nearest-neighbor.
 * Pontos sem coordenada vão para o final, mantendo a ordem original entre si.
 */
export function nearestNeighborOrder<T extends { coord?: LatLng | null }>(
  origin: LatLng,
  stops: T[],
): T[] {
  const withCoord = stops.filter((s) => s.coord);
  const withoutCoord = stops.filter((s) => !s.coord);
  const remaining = [...withCoord];
  const ordered: T[] = [];
  let current = origin;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i].coord!);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next.coord!;
  }
  return [...ordered, ...withoutCoord];
}

/**
 * Monta URL do Google Maps com waypoints. Funciona em web e mobile.
 * Origem opcional — se ausente, Maps usa localização do usuário.
 */
export function buildGoogleMapsRoute(
  stops: Array<{ coord?: LatLng | null; address?: string | null }>,
  origin?: LatLng | null,
): string {
  const parts: string[] = ["https://www.google.com/maps/dir/?api=1"];

  const waypointTokens: string[] = [];
  let destinationToken = "";

  const tokens = stops
    .map((s) => {
      if (s.coord) return `${s.coord.lat},${s.coord.lng}`;
      if (s.address) return encodeURIComponent(s.address);
      return null;
    })
    .filter(Boolean) as string[];

  if (!tokens.length) return "https://www.google.com/maps";

  destinationToken = tokens[tokens.length - 1];
  waypointTokens.push(...tokens.slice(0, -1));

  if (origin) parts.push(`origin=${origin.lat},${origin.lng}`);
  parts.push(`destination=${destinationToken}`);
  if (waypointTokens.length) parts.push(`waypoints=${waypointTokens.join("|")}`);
  parts.push("travelmode=driving");

  return parts[0] + "&" + parts.slice(1).join("&");
}

/**
 * Formata distância em km para exibição (ex: "1,2 km" ou "850 m").
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace(".", ",")} km`;
}

/**
 * Estima tempo total da rota: 25 km/h média urbana + 20 min por parada.
 */
export function estimateRouteMinutes(totalKm: number, stops: number): number {
  const driveMin = (totalKm / 25) * 60;
  const visitMin = stops * 20;
  return Math.round(driveMin + visitMin);
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
