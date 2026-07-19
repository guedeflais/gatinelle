import { startOfMonthParis } from "@/lib/dateRanges";

describe("startOfMonthParis", () => {
  it("reste dans le mois précédent juste après minuit heure de Paris en été (CEST, UTC+2)", () => {
    const result = startOfMonthParis(new Date("2026-07-01T00:30:00+02:00"));
    expect(result.toISOString()).toBe("2026-06-30T22:00:00.000Z");
  });

  it("reste dans le mois précédent juste après minuit heure de Paris en hiver (CET, UTC+1)", () => {
    const result = startOfMonthParis(new Date("2026-01-01T00:30:00+01:00"));
    expect(result.toISOString()).toBe("2025-12-31T23:00:00.000Z");
  });

  it("renvoie la même date pour deux instants du même mois parisien", () => {
    const start = startOfMonthParis(new Date("2026-07-05T10:00:00+02:00"));
    const end = startOfMonthParis(new Date("2026-07-31T23:59:00+02:00"));
    expect(start.toISOString()).toBe(end.toISOString());
  });
});
