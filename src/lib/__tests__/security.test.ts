import { timingSafeEqualString } from "@/lib/security";

describe("timingSafeEqualString", () => {
  it("retourne true pour deux chaînes identiques", () => {
    expect(timingSafeEqualString("secret-123", "secret-123")).toBe(true);
  });

  it("retourne false pour des chaînes différentes de même longueur", () => {
    expect(timingSafeEqualString("secret-123", "secret-456")).toBe(false);
  });

  it("retourne false pour des chaînes de longueurs différentes sans lever d'erreur", () => {
    expect(timingSafeEqualString("short", "much-longer-string")).toBe(false);
  });

  it("retourne false pour une chaîne vide comparée à une chaîne non vide", () => {
    expect(timingSafeEqualString("", "secret")).toBe(false);
  });
});
