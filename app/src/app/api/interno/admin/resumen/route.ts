import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  // Totals by state
  const byOficina = db.prepare(`
    SELECT
      c.oficina,
      COUNT(*) AS total,
      SUM(CASE WHEN c.status='aprobado' THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN c.status='enviado'  THEN 1 ELSE 0 END) AS pendientes,
      SUM(CASE WHEN c.status='borrador' THEN 1 ELSE 0 END) AS borradores,
      SUM(CASE WHEN c.status='rechazado' THEN 1 ELSE 0 END) AS rechazadas,
      COUNT(DISTINCT c.mes) AS meses_con_captura
    FROM capturas c
    GROUP BY c.oficina
    ORDER BY c.oficina
  `).all();

  // Totals by month
  const byMes = db.prepare(`
    SELECT
      c.mes,
      COUNT(*) AS total,
      SUM(CASE WHEN c.status='aprobado' THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN c.status='enviado'  THEN 1 ELSE 0 END) AS pendientes,
      COUNT(DISTINCT c.oficina) AS oficinas_con_captura
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
  const totalOficinas = db.prepare('SELECT COUNT(DISTINCT oficina) AS n FROM indicadores_2026').get() as { n: number };

  return NextResponse.json({ global, byOficina, byMes, totalIndicadores: totalIndicadores.n, totalOficinas: totalOficinas.n });
}
