import crypto from "crypto";

/**
 * Compare deux chaînes en temps constant (protège contre une attaque par
 * mesure de temps, qui pourrait sinon deviner un secret caractère par
 * caractère via une comparaison `===` classique, laquelle s'arrête dès la
 * première différence).
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
