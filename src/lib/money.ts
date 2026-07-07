// Les montants sont stockés en centimes de gâtinelle (Int) pour éviter les
// erreurs d'arrondi des flottants. 1 gâtinelle = 100 centimes = 1 euro.

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}

export function formatGatinelles(cents: number): string {
  return `${centsToEuros(cents).toFixed(2)} G`;
}
