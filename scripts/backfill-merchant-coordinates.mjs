// Géocode une seule fois les commerçants déjà existants qui n'ont pas encore
// de latitude/longitude (créés avant l'ajout de la carte interactive). Les
// nouveaux commerçants sont géocodés automatiquement à l'inscription/mise à
// jour de profil (voir src/lib/geocoding.ts) — ce script ne sert qu'au
// rattrapage ponctuel, à exécuter manuellement une seule fois par base.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BAN_URL = "https://api-adresse.data.gouv.fr/search/";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Gatinelle-App/1.0 (contact: jardinsdugue079@gmail.com)";
// Politique d'usage Nominatim : 1 requête/seconde max pour un usage ponctuel,
// on reste large en dessous (1,5 s) par prudence. La BAN n'impose pas de
// limite comparable, mais on garde le même délai par simplicité/prudence.
const DELAY_MS = 1500;

async function geocodeViaBan(address) {
  const url = `${BAN_URL}?q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  const first = data.features[0];
  if (!first) return null;
  const [longitude, latitude] = first.geometry.coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

async function geocodeViaNominatim(address) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Referer: "https://gatinelle.fr" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const results = await res.json();
  const first = results[0];
  if (!first) return null;
  const latitude = Number(first.lat);
  const longitude = Number(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

async function geocodeAddress(address) {
  const viaBan = await geocodeViaBan(address);
  if (viaBan) return viaBan;
  return geocodeViaNominatim(address);
}

const merchants = await prisma.merchantProfile.findMany({
  where: { latitude: null },
  select: { id: true, businessName: true, address: true },
});

console.log(`${merchants.length} commerçant(s) sans coordonnées.`);

let success = 0;
const failed = [];

for (const merchant of merchants) {
  const coordinates = await geocodeAddress(merchant.address).catch(() => null);
  if (coordinates) {
    await prisma.merchantProfile.update({
      where: { id: merchant.id },
      data: coordinates,
    });
    success += 1;
    console.log(`OK  ${merchant.businessName} — ${merchant.address}`);
  } else {
    failed.push(merchant);
    console.log(`ÉCHEC  ${merchant.businessName} — ${merchant.address}`);
  }
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

console.log(`\n${success}/${merchants.length} géocodés avec succès.`);
if (failed.length > 0) {
  console.log("Adresses à corriger manuellement :");
  for (const m of failed) console.log(`  - ${m.businessName} : ${m.address}`);
}

await prisma.$disconnect();
