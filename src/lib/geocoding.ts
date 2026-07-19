// Géocodage via Nominatim (OpenStreetMap), le seul service de géocodage
// public sans clé d'API — adapté à une petite association sans budget pour
// Google Maps/Mapbox. Politique d'usage : 1 requête/seconde max, User-Agent
// obligatoire identifiant l'appli (voir https://operations.osmfoundation.org/policies/nominatim/).
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Gatinelle-App/1.0 (contact: jardinsdugue079@gmail.com)";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Best-effort : renvoie null (jamais d'exception) si l'adresse n'est pas
// reconnue ou si le service est indisponible — un échec de géocodage ne doit
// jamais faire échouer une inscription ou une mise à jour de profil.
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1`;

  try {
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
  } catch {
    return null;
  }
}
