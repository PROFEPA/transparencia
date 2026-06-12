import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { unidadResponsableSql } from '@/lib/unidades-responsables';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const oficinaExpr = unidadResponsableSql('c.oficina');
  const indicadorOficinaExpr = unidadResponsableSql('oficina');

  // Totals by state
  const byOficina = db.prepare(`
    SELECT
      ${oficinaExpr} AS oficina,
      COUNT(*) AS total,
      SUM(CASE WHEN c.status='aprobado' THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN c.status='enviado'  THEN 1 ELSE 0 END) AS pendientes,
      SUM(CASE WHEN c.status='borrador' THEN 1 ELSE 0 END) AS borradores,
      SUM(CASE WHEN c.status='rechazado' THEN 1 ELSE 0 END) AS rechazadas,
      COUNT(DISTINCT c.mes) AS meses_con_captura
    FROM capturas c
    GROUP BY ${oficinaExpr}
    ORDER BY oficina
  `).all();

  // Totals by month
  const byMes = db.prepare(`
    SELECT
      c.mes,
      COUNT(*) AS total,
      SUM(CASE WHEN c.status='aprobado' THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN c.status='enviado'  THEN 1 ELSE 0 END) AS pendientes,
      COUNT(DISTINCT ${oficinaExpr}) AS oficinas_con_captura
    FROM capturas c
    GROUP BY c.mes
    ORDER BY c.mes
  `).all();

  // Global counters
  const global = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status='aprobado'  THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN status='enviado'   THEN 1 ELSE 0 END) AS pendientes,
      SUM(CASE WHEN status='borrador'  THEN 1 ELSE 0 END) AS borradores,
      SUM(CASE WHEN status='rechazado' THEN 1 ELSE 0 END) AS rechazadas
    FROM capturas
  `).get();

  const totalIndicadores = db.prepare('SELECT COUNT(*) AS n FROM indicadores_2026').get() as { n: number };
  const totalOficinas = db.prepare('SELECT COUNT(DISTINCT ' + indicadorOficinaExpr + ') AS n FROM indicadores_2026').get() as { n: number };
  const totalIndicadoresDistinct = db.prepare('SELECT COUNT(DISTINCT codigo) AS n FROM indicadores_2026').get() as { n: number };

  // Count non-null monthly programming entries = "Metas Registradas"
  const metasReg = db.prepare(`
    SELECT (
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_ene IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_feb IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_mzo IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_abr IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_may IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_jun IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_jul IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_ago IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_sep IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_oct IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_nov IS NOT NULL) +
      (SELECT COUNT(*) FROM indicadores_2026 WHERE prog_dic IS NOT NULL)
    ) AS n
  `).get() as { n: number };

  return NextResponse.json({
    global, byOficina, byMes,
    totalIndicadores: totalIndicadores.n,
    totalOficinas: totalOficinas.n,
    totalIndicadoresDistinct: totalIndicadoresDistinct.n,
    metasRegistradas: metasReg.n,
  });
}
