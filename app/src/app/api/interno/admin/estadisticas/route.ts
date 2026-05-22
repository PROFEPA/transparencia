import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const MESES_LABEL = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export async function GET() {
  const db = getDb();

  // Monthly aggregates: programado vs avance totals
  const porMes = db.prepare(`
    SELECT
      mes,
      COUNT(*) AS total_capturas,
      SUM(CASE WHEN status='aprobado'  THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN status='enviado'   THEN 1 ELSE 0 END) AS enviadas,
      SUM(CASE WHEN status='borrador'  THEN 1 ELSE 0 END) AS borradores,
      SUM(CASE WHEN status='rechazado' THEN 1 ELSE 0 END) AS rechazadas,
      SUM(CASE WHEN status='aprobado' AND programado IS NOT NULL THEN programado ELSE 0 END) AS prog_total,
      SUM(CASE WHEN status='aprobado' AND avance    IS NOT NULL THEN avance    ELSE 0 END) AS avan_total
    FROM capturas
    GROUP BY mes
    ORDER BY mes
  `).all() as Record<string, number>[];

  const porMesChart = MESES_LABEL.slice(1).map((label, i) => {
    const mes = i + 1;
    const row = porMes.find(r => r.mes === mes);
    return {
      mes,
      label,
      aprobadas: row?.aprobadas ?? 0,
      enviadas: row?.enviadas ?? 0,
      borradores: row?.borradores ?? 0,
      rechazadas: row?.rechazadas ?? 0,
      prog: row?.prog_total ?? 0,
      avan: row?.avan_total ?? 0,
      pct: (row?.prog_total && row.prog_total > 0)
        ? Math.round((row.avan_total / row.prog_total) * 100)
        : null,
    };
  });

  // Per ORPA × month status matrix
  const matrizRaw = db.prepare(`
    SELECT
      c.oficina,
      c.mes,
      c.status,
      c.programado,
      c.avance,
      COUNT(*) OVER (PARTITION BY c.oficina) AS total_office,
      SUM(CASE WHEN c.status='aprobado' THEN 1 ELSE 0 END)
        OVER (PARTITION BY c.oficina) AS aprobadas_office
    FROM capturas c
    ORDER BY c.oficina, c.mes
  `).all() as Record<string, number | string>[];

  // Group by oficina
  const oficinasMap: Record<string, {
    oficina: string;
    meses: Record<number, { status: string; pct: number | null; avance: number | null; programado: number | null }>;
    total: number;
    aprobadas: number;
    enviadas: number;
    pct_overall: number | null;
  }> = {};

  for (const row of matrizRaw) {
    const ofc = row.oficina as string;
    if (!oficinasMap[ofc]) {
      oficinasMap[ofc] = { oficina: ofc, meses: {}, total: 0, aprobadas: 0, enviadas: 0, pct_overall: null };
    }
    const mes = row.mes as number;
    const prog = row.programado as number | null;
    const avan = row.avance as number | null;
    oficinasMap[ofc].meses[mes] = {
      status: row.status as string,
      pct: (prog && prog > 0 && avan !== null) ? Math.round((avan / prog) * 100) : null,
      avance: avan,
      programado: prog,
    };
  }

  // Compute totals per oficina
  const countRaw = db.prepare(`
    SELECT oficina,
      COUNT(*) AS total,
      SUM(CASE WHEN status='aprobado'  THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN status='enviado'   THEN 1 ELSE 0 END) AS enviadas,
      SUM(CASE WHEN status='aprobado' AND programado>0 THEN avance   ELSE 0 END) AS avan_sum,
      SUM(CASE WHEN status='aprobado' AND programado>0 THEN programado ELSE 0 END) AS prog_sum
    FROM capturas
    GROUP BY oficina
  `).all() as Record<string, number | string>[];

  for (const row of countRaw) {
    const ofc = row.oficina as string;
    if (oficinasMap[ofc]) {
      oficinasMap[ofc].total = row.total as number;
      oficinasMap[ofc].aprobadas = row.aprobadas as number;
      oficinasMap[ofc].enviadas = row.enviadas as number;
      const ps = row.prog_sum as number;
      const as_ = row.avan_sum as number;
      oficinasMap[ofc].pct_overall = ps > 0 ? Math.round((as_ / ps) * 100) : null;
    }
  }

  const matriz = Object.values(oficinasMap).sort((a, b) => a.oficina.localeCompare(b.oficina));

  // Per indicator compliance
  const porIndicador = db.prepare(`
    SELECT
      i.codigo, i.nombre, i.serie,
      COUNT(c.id) AS capturas_total,
      SUM(CASE WHEN c.status='aprobado' THEN 1 ELSE 0 END) AS aprobadas,
      COUNT(DISTINCT c.oficina) AS oficinas,
      SUM(CASE WHEN c.status='aprobado' AND c.programado>0 THEN c.avance   ELSE 0 END) AS avan_sum,
      SUM(CASE WHEN c.status='aprobado' AND c.programado>0 THEN c.programado ELSE 0 END) AS prog_sum
    FROM indicadores_2026 i
    LEFT JOIN capturas c ON c.indicador_id = i.id
    GROUP BY i.codigo, i.nombre, i.serie
    ORDER BY i.codigo
  `).all() as Record<string, number | string>[];

  const indicadores = porIndicador.map(r => ({
    codigo: r.codigo,
    nombre: r.nombre,
    serie: r.serie,
    capturas: r.capturas_total,
    aprobadas: r.aprobadas,
    oficinas: r.oficinas,
    pct: (r.prog_sum as number) > 0
      ? Math.round(((r.avan_sum as number) / (r.prog_sum as number)) * 100)
      : null,
  }));

  // Pie data for status distribution
  const totalRaw = db.prepare(`
    SELECT
      SUM(CASE WHEN status='aprobado'  THEN 1 ELSE 0 END) AS aprobadas,
      SUM(CASE WHEN status='enviado'   THEN 1 ELSE 0 END) AS enviadas,
      SUM(CASE WHEN status='borrador'  THEN 1 ELSE 0 END) AS borradores,
      SUM(CASE WHEN status='rechazado' THEN 1 ELSE 0 END) AS rechazadas,
      COUNT(*) AS total
    FROM capturas
  `).get() as Record<string, number>;

  const pie = [
    { name: 'Aprobadas', value: totalRaw.aprobadas ?? 0, color: '#10B981' },
    { name: 'Enviadas',  value: totalRaw.enviadas  ?? 0, color: '#3B82F6' },
    { name: 'Borradores',value: totalRaw.borradores?? 0, color: '#F59E0B' },
    { name: 'Rechazadas',value: totalRaw.rechazadas?? 0, color: '#EF4444' },
  ].filter(d => d.value > 0);

  return NextResponse.json({ porMesChart, matriz, indicadores, pie, total: totalRaw.total ?? 0 });
}
