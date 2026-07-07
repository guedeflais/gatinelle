const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sans I/O, ambigus avec 1/0

/** Format inspiré de l'Eusko : une lettre + 5 chiffres, ex. "A00042". */
export function generateMemberNumber(): string {
  const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const digits = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `${letter}${digits}`;
}
