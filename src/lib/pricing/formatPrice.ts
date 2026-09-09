const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/**
 * Formate des centimes pour l'affichage : `30500` → « 305,00 € ».
 * La division par 100 n'a lieu qu'ici — jamais dans un calcul.
 */
export function formatPriceCents(cents: number): string {
  return EUR.format(cents / 100);
}
