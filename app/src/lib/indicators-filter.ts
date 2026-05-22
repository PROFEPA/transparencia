/**
 * Indicadores que se ocultan en la UI pública.
 * Los datos permanecen en los archivos JSON; solo se filtran en las vistas.
 */
export const HIDDEN_INDICATOR_IDS = new Set<string>([
  // "Aportar al Humanismo Mexicano mediante la Procuración de la Justicia Ambiental"
  // — Es el objetivo general del programa, no un indicador medible.
  'aportar-al-humanismo-mexicano-mediante-la-procuracion-de-la-g005-2025',
  'aportar-al-humanismo-mexicano-mediante-la-procuracion-de-la-g005-2026',
]);

export const HIDDEN_INDICATOR_PREFIXES: string[] = [
  'aportar-al-humanismo-mexicano-',
];

export function isHiddenIndicator(id: string): boolean {
  if (HIDDEN_INDICATOR_IDS.has(id)) return true;
  return HIDDEN_INDICATOR_PREFIXES.some((p) => id.startsWith(p));
}
