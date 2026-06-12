const UNIDAD_RESPONSABLE_ALIASES: Record<string, string> = {
  ZMVM: 'CDMX-ZMVM',
  'Oficinas Centrales SIVI': 'Oficinas Centrales (SIVI)',
};

export function normalizeUnidadResponsable(oficina: string | null | undefined): string {
  const value = oficina?.trim() ?? '';
  return UNIDAD_RESPONSABLE_ALIASES[value] ?? value;
}

export function getUnidadResponsableAliases(oficina: string): string[] {
  const normalized = normalizeUnidadResponsable(oficina);
  const aliases = new Set<string>([normalized]);

  Object.entries(UNIDAD_RESPONSABLE_ALIASES).forEach(([alias, canonical]) => {
    if (canonical === normalized) aliases.add(alias);
  });

  return [...aliases];
}

export function unidadResponsableSql(column: string): string {
  return `CASE
    WHEN ${column} = 'ZMVM' THEN 'CDMX-ZMVM'
    WHEN ${column} = 'Oficinas Centrales SIVI' THEN 'Oficinas Centrales (SIVI)'
    ELSE ${column}
  END`;
}
