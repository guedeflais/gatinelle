// Géocodage : la Base Adresse Nationale (BAN, api-adresse.data.gouv.fr) en
// priorité — service public français gratuit sans clé d'API, avec une bien
// meilleure couverture des adresses rurales (lieux-dits, hameaux) que
// Nominatim pour la France. Nominatim (OpenStreetMap) sert de repli pour les
// cas rares où la BAN ne renverrait rien.
const BAN_URL = "https://api-adresse.data.gouv.fr/search/";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Gatinelle-App/1.0 (contact: jardinsdugue079@gmail.com)";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

async function geocodeViaBan(address: string): Promise<Coordinates | null> {
  const url = `${BAN_URL}?q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;

  const data: { features: Array<{ geometry: { coordinates: [number, number] } }> } = await res.json();
  const first = data.features[0];
  if (!first) return null;

  const [longitude, latitude] = first.geometry.coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

async function geocodeViaNominatim(address: string): Promise<Coordinates | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Referer: "https://gatinelle.fr" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;

  const results: Array<{ lat: string; lon: string }> = await res.json();
  const first = results[0];
  if (!first) return null;

  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

// Best-effort : renvoie null (jamais d'exception) si l'adresse n'est
// reconnue par aucun des deux services — un échec de géocodage ne doit
// jamais faire échouer une inscription ou une mise à jour de profil.
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const viaBan = await geocodeViaBan(address);
    if (viaBan) return viaBan;
    return await geocodeViaNominatim(address);
  } catch {
    return null;
  }
}
