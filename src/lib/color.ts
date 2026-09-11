/**
 * Luminance relative (WCAG) d'une couleur hex `#rrggbb`, utilisée pour
 * choisir un contour/texte clair ou sombre selon la couleur posée plutôt
 * qu'une valeur fixe qui devient invisible sur certaines teintes (ex.
 * contour de la vue 2D sur une keycap noire, étiquettes 3D sur un châssis
 * noir). Retombe sur une valeur claire (1) pour tout ce qui n'est pas un
 * hex à 6 chiffres (`rgb()`, mot-clé CSS…).
 */
export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return 1;
  const value = match[1]!;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
