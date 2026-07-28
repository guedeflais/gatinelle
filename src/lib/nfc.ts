// Web NFC (NDEFReader) : ne fonctionne que sur Chrome pour Android, en HTTPS.
// Aucun autre navigateur/appareil ne l'expose — les appelants doivent prévoir
// une solution de repli (saisie manuelle) quand isNfcSupported() est faux.

export function isNfcSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

export class NfcNotSupportedError extends Error {
  constructor() {
    super("La lecture NFC n'est pas disponible sur cet appareil/navigateur.");
    this.name = "NfcNotSupportedError";
  }
}

/**
 * Lance une lecture NFC et résout avec le numéro de série d'usine du tag
 * détecté (bracelet/carte) — utilisé tel quel comme identifiant, sans avoir
 * besoin d'écrire de données NDEF sur le tag au préalable.
 */
export async function scanNfcTag(): Promise<string> {
  if (!isNfcSupported()) throw new NfcNotSupportedError();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reader = new (window as any).NDEFReader();
  await reader.scan();

  return new Promise<string>((resolve, reject) => {
    reader.addEventListener(
      "reading",
      (event: { serialNumber: string }) => {
        resolve(event.serialNumber);
      },
      { once: true }
    );
    reader.addEventListener(
      "readingerror",
      () => {
        reject(new Error("Impossible de lire le tag NFC. Réessayez."));
      },
      { once: true }
    );
  });
}
