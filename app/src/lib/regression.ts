/**
 * Regresión lineal simple (mínimos cuadrados) para series temporales.
 * Devuelve la pendiente, intercepto y predicciones futuras.
 */
export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
}

export function linearRegression(values: number[]): RegressionResult {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: values[0] ?? 0, r2: 0, predict: () => values[0] ?? 0 };
  }
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = values[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const slope = denX === 0 ? 0 : num / denX;
  const intercept = meanY - slope * meanX;
  const r2 = denX === 0 || denY === 0 ? 0 : (num * num) / (denX * denY);
  return { slope, intercept, r2, predict: (x) => slope * x + intercept };
}

/**
 * Aplica la línea de tendencia a los puntos existentes y proyecta `forecastSteps` puntos.
 */
export function buildTrendLine<T extends { periodo: string; valor: number | null | undefined }>(
  series: T[],
  forecastSteps = 3
): { periodo: string; tendencia: number; isForecast: boolean }[] {
  const valid = series
    .map((s, i) => ({ i, periodo: s.periodo, v: s.valor }))
    .filter((p): p is { i: number; periodo: string; v: number } => p.v != null && !Number.isNaN(p.v));
  if (valid.length < 2) return [];
  const reg = linearRegression(valid.map((p) => p.v));
  const result: { periodo: string; tendencia: number; isForecast: boolean }[] = [];
  for (let i = 0; i < series.length; i++) {
    result.push({ periodo: series[i].periodo, tendencia: reg.predict(i), isForecast: false });
  }
  // Proyección: continúa el patrón YYYY-MM si aplica
  const last = series[series.length - 1].periodo;
  const m = last.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    let year = parseInt(m[1], 10);
    let month = parseInt(m[2], 10);
    for (let k = 1; k <= forecastSteps; k++) {
      month += 1;
      if (month > 12) { month = 1; year += 1; }
      const periodo = `${year}-${String(month).padStart(2, '0')}`;
      result.push({ periodo, tendencia: reg.predict(series.length - 1 + k), isForecast: true });
    }
  }
  return result;
}
