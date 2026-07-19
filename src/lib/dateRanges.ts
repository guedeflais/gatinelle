const PARIS_TZ = "Europe/Paris";

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - date.getTime();
}

// Calcule le début du mois courant en heure de Paris plutôt qu'en UTC (heure du
// serveur Vercel) : sans cette correction, les transactions faites entre 0h et
// 1h ou 2h (selon CET/CEST) le 1er du mois seraient comptées dans le mauvais mois.
export function startOfMonthParis(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  const naiveUTC = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, 1, 0, 0, 0));
  return new Date(naiveUTC.getTime() - tzOffsetMs(naiveUTC, PARIS_TZ));
}
